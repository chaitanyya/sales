import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  getSubscriptionStatus,
  checkLockout,
  validateSubscriptionToken,
  updateSubscriptionStatus,
  clearSubscriptionState as clearSubscriptionStateCmd,
} from "@/lib/tauri/commands";

/**
 * Subscription tier types
 */
export type SubscriptionTier = "free" | "pro" | "enterprise";

/**
 * Feature flags
 */
export type FeatureFlag =
  | "basic_scoring"
  | "advanced_scoring"
  | "bulk_research"
  | "export_data"
  | "cloud_backup"
  | "team_collaboration"
  | "api_access"
  | "custom_prompts";

/**
 * Subscription limits configuration
 */
export interface SubscriptionLimits {
  maxLeads: number;
  maxPeople: number;
  maxScoringConfigs: number;
  maxJobsPerMonth: number;
  features: FeatureFlag[];
}

/**
 * Subscription tier configurations
 */
const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxLeads: 50,
    maxPeople: 100,
    maxScoringConfigs: 1,
    maxJobsPerMonth: 20,
    features: ["basic_scoring"],
  },
  pro: {
    maxLeads: 500,
    maxPeople: 2000,
    maxScoringConfigs: 5,
    maxJobsPerMonth: 200,
    features: [
      "basic_scoring",
      "advanced_scoring",
      "bulk_research",
      "export_data",
      "custom_prompts",
    ],
  },
  enterprise: {
    maxLeads: -1, // unlimited
    maxPeople: -1,
    maxScoringConfigs: -1,
    maxJobsPerMonth: -1,
    features: [
      "basic_scoring",
      "advanced_scoring",
      "bulk_research",
      "export_data",
      "cloud_backup",
      "team_collaboration",
      "api_access",
      "custom_prompts",
    ],
  },
};

/**
 * Subscription metadata from Clerk user metadata
 */
export interface SubscriptionMetadata {
  tier: SubscriptionTier;
  status: "active" | "canceled" | "past_due" | "expired" | "incomplete";
  limits?: Partial<SubscriptionLimits>;
  expiresAt?: number | null;
}

/**
 * Subscription State
 */
interface SubscriptionState {
  // Current subscription
  tier: SubscriptionTier;
  status: SubscriptionMetadata["status"];
  limits: SubscriptionLimits;
  expiresAt: number | null;

  // Loading state
  isLoading: boolean;

  // Lockout state
  isLockedOut: boolean;
  lockoutReason: string | null;
  gracePeriodEndsAt: number | null;
  daysUntilLockout: number | null;

  // Actions
  setSubscription: (metadata: SubscriptionMetadata) => void;
  updateFromClerkMetadata: (metadata: Record<string, unknown>) => void;

  // Check limits
  checkLimit: (resource: keyof SubscriptionLimits, current: number) => boolean;
  getLimit: (resource: keyof SubscriptionLimits) => number;

  // Feature flags
  isFeatureEnabled: (feature: FeatureFlag) => boolean;
  hasFeatureAccess: (feature: FeatureFlag) => boolean;

  // Subscription status
  isActive: () => boolean;
  isCancelled: () => boolean;
  isPastDue: () => boolean;

  // Get tier name for display
  getTierName: () => string;
  getTierDisplay: () => string;

  // Lockout actions
  checkLockout: () => Promise<void>;
  updateFromToken: (token: string, subscriptionData: SubscriptionMetadata) => Promise<void>;
  clearState: () => Promise<void>;
}

/**
 * Parse subscription metadata from Clerk user metadata
 */
function parseSubscriptionMetadata(
  metadata: Record<string, unknown>
): SubscriptionMetadata {
  const subscription = (metadata.subscription as Record<string, unknown>) || {};

  return {
    tier: (subscription.tier as SubscriptionTier) || "free",
    status: (subscription.status as SubscriptionMetadata["status"]) || "active",
    limits: (subscription.limits as Partial<SubscriptionLimits>) || undefined,
    expiresAt: (subscription.expiresAt as number | null) || null,
  };
}

/**
 * Merge custom limits with tier defaults
 */
function mergeLimits(
  tier: SubscriptionTier,
  customLimits?: Partial<SubscriptionLimits>
): SubscriptionLimits {
  const baseLimits = TIER_LIMITS[tier];
  if (!customLimits) return baseLimits;

  return {
    ...baseLimits,
    ...customLimits,
    features: customLimits.features || baseLimits.features,
  };
}

/**
 * Subscription Store - Manages subscription tier and feature limits
 */
export const useSubscriptionStore = create<SubscriptionState>()(
  immer((set, get) => ({
    // Initial state - free tier
    tier: "free",
    status: "active",
    limits: TIER_LIMITS.free,
    expiresAt: null,
    isLoading: false,
    isLockedOut: false,
    lockoutReason: null,
    gracePeriodEndsAt: null,
    daysUntilLockout: null,

    // Set subscription directly
    setSubscription: (metadata) =>
      set((state) => {
        state.tier = metadata.tier;
        state.status = metadata.status;
        state.limits = mergeLimits(metadata.tier, metadata.limits);
        state.expiresAt = metadata.expiresAt ?? null;
      }),

    // Update from Clerk user metadata
    updateFromClerkMetadata: (metadata) =>
      set((state) => {
        const subscription = parseSubscriptionMetadata(metadata);
        state.tier = subscription.tier;
        state.status = subscription.status;
        state.limits = mergeLimits(subscription.tier, subscription.limits);
        state.expiresAt = subscription.expiresAt ?? null;
      }),

    // Check if current value is within limit
    checkLimit: (resource, current) => {
      const limit = get().limits[resource];
      // -1 means unlimited, features is an array so handle separately
      if (typeof limit !== "number") return true;
      if (limit === -1) return true;
      return current < limit;
    },

    // Get the limit for a resource (numeric limits only)
    getLimit: (resource) => {
      const limit = get().limits[resource];
      // Return infinity for unlimited or if it's not a numeric field
      if (typeof limit !== "number") return Number.POSITIVE_INFINITY;
      return limit === -1 ? Number.POSITIVE_INFINITY : limit;
    },

    // Check if a feature is enabled
    isFeatureEnabled: (feature) => {
      return get().limits.features.includes(feature);
    },

    // Alias for isFeatureEnabled
    hasFeatureAccess: (feature) => {
      return get().limits.features.includes(feature);
    },

    // Check if subscription is active
    isActive: () => {
      const state = get();
      return state.status === "active";
    },

    // Check if subscription is cancelled
    isCancelled: () => {
      const state = get();
      return state.status === "canceled";
    },

    // Check if subscription is past due
    isPastDue: () => {
      const state = get();
      return state.status === "past_due";
    },

    // Get tier name
    getTierName: () => {
      return get().tier;
    },

    // Get display name for tier
    getTierDisplay: () => {
      const tier = get().tier;
      switch (tier) {
        case "free":
          return "Free";
        case "pro":
          return "Pro";
        case "enterprise":
          return "Enterprise";
        default:
          return tier;
      }
    },

    // Check lockout status from backend
    checkLockout: async () => {
      try {
        const status = await checkLockout();
        set((state) => {
          state.isLockedOut = status.locked;
          state.lockoutReason = status.reason ?? null;
          state.gracePeriodEndsAt = status.gracePeriodEndsAt ?? null;
        });
      } catch (error) {
        console.error("Failed to check lockout status:", error);
      }
    },

    // Update subscription from token (after login)
    updateFromToken: async (token, subscriptionData) => {
      try {
        await validateSubscriptionToken(
          token,
          subscriptionData.status,
          subscriptionData.expiresAt ?? undefined,
        );
        set((state) => {
          state.status = subscriptionData.status;
          state.isLockedOut = false;
          state.lockoutReason = null;
        });
      } catch (error) {
        console.error("Failed to validate subscription token:", error);
      }
    },

    // Clear subscription state (for logout)
    clearState: async () => {
      try {
        await clearSubscriptionStateCmd();
        set((state) => {
          state.tier = "free";
          state.status = "active";
          state.limits = TIER_LIMITS.free;
          state.expiresAt = null;
          state.isLockedOut = false;
          state.lockoutReason = null;
          state.gracePeriodEndsAt = null;
          state.daysUntilLockout = null;
        });
      } catch (error) {
        console.error("Failed to clear subscription state:", error);
      }
    },
  }))
);

/**
 * Hook to get current subscription limits
 */
export const useSubscriptionLimits = () => {
  return useSubscriptionStore((state) => state.limits);
};

/**
 * Hook to check if a feature is enabled
 */
export const useFeatureEnabled = (feature: FeatureFlag) => {
  return useSubscriptionStore((state) => state.isFeatureEnabled(feature));
};

/**
 * Hook to get subscription tier
 */
export const useSubscriptionTier = () => {
  return useSubscriptionStore((state) => ({
    tier: state.tier,
    tierDisplay: state.getTierDisplay(),
    isActive: state.isActive(),
  }));
};
