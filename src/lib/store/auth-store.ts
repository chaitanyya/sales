import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { queryClient } from "@/lib/query/query-client";
import { useSubscriptionStore } from "@/lib/store/subscription-store";

/**
 * Clerk User interface (minimal)
 */
export interface ClerkUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string;
  imageUrl?: string | null;
  publicMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
}

/**
 * Clerk Organization interface (minimal)
 */
export interface ClerkOrganization {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  publicMetadata?: Record<string, unknown>;
}

/**
 * Clerk Organization Membership
 */
export interface ClerkOrgMembership {
  id: string;
  organization: ClerkOrganization;
  role: string;
}

/**
 * Clerk Session interface (minimal)
 */
export interface ClerkSession {
  id: string;
  userId: string;
  status: "active" | "expired" | "revoked" | "abandoned";
  expireAt?: number | null;
  token?: string; // JWT token for subscription validation
}

/**
 * Auth State
 */
interface AuthState {
  // User data
  user: ClerkUser | null;
  session: ClerkSession | null;

  // Organization data
  org: ClerkOrganization | null;
  orgMemberships: ClerkOrgMembership[];

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setUser: (user: ClerkUser | null) => void;
  setSession: (session: ClerkSession | null) => void;
  setOrg: (org: ClerkOrganization | null) => void;
  setOrgMemberships: (memberships: ClerkOrgMembership[]) => void;

  // Initialize from Clerk
  initializeFromClerk: (data: {
    user?: ClerkUser | null;
    session?: ClerkSession | null;
    orgMemberships?: ClerkOrgMembership[];
  }) => void;

  // Switch organization
  switchOrg: (orgId: string) => void;

  // Logout
  clearAuth: () => void;

  // Get current organization ID
  getCurrentOrgId: () => string | null;

  // Get current user ID
  getCurrentUserId: () => string | null;
}

/**
 * Auth Store - Manages authentication and organization state
 */
export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    // Initial state
    user: null,
    session: null,
    org: null,
    orgMemberships: [],
    isLoading: false,
    isInitialized: false,

    // Setters
    setUser: (user) =>
      set((state) => {
        state.user = user;
      }),

    setSession: (session) =>
      set((state) => {
        state.session = session;

        // Validate subscription token when session is set
        if (session?.token && state.user) {
          // Extract subscription data from user metadata
          const metadata = state.user.unsafeMetadata || state.user.publicMetadata || {};
          const subscription = (metadata.subscription as Record<string, unknown>) || {};

          const subscriptionData = {
            tier: (subscription.tier as "free" | "pro" | "enterprise") || "free",
            status: (subscription.status as "active" | "canceled" | "past_due" | "expired") || "active",
            expiresAt: (subscription.expiresAt as number | null) || null,
          };

          // Validate token asynchronously (non-blocking)
          useSubscriptionStore.getState().updateFromToken(session.token, subscriptionData);
        }
      }),

    setOrg: (org) =>
      set((state) => {
        state.org = org;
      }),

    setOrgMemberships: (memberships) =>
      set((state) => {
        state.orgMemberships = memberships;
      }),

    // Initialize from Clerk SDK
    initializeFromClerk: ({ user, session, orgMemberships }) =>
      set((state) => {
        if (user !== undefined) state.user = user;
        if (session !== undefined) state.session = session;
        if (orgMemberships !== undefined) {
          state.orgMemberships = orgMemberships;
          // Set first org as current if none selected
          if (!state.org && orgMemberships.length > 0) {
            state.org = orgMemberships[0].organization;
          }
        }
        state.isInitialized = true;
      }),

    // Switch organization - clear cache to prevent cross-org data leakage
    switchOrg: (orgId) =>
      set((state) => {
        const membership = state.orgMemberships.find((m) => m.organization.id === orgId);
        if (membership) {
          const oldOrgId = state.org?.id ?? null;
          state.org = membership.organization;

          // Clear all cached data from previous org to prevent cross-org data leakage
          queryClient.clear();
        }
      }),

    // Clear auth state (logout) - clear cache to prevent data persistence
    clearAuth: () =>
      set((state) => {
        state.user = null;
        state.session = null;
        state.org = null;
        state.orgMemberships = [];
        state.isInitialized = false;

        // Clear all cached data on logout to prevent data leakage to next user
        queryClient.clear();

        // Clear subscription state
        useSubscriptionStore.getState().clearState();
      }),

    // Getters
    getCurrentOrgId: () => {
      const state = get();
      return state.org?.id ?? null;
    },

    getCurrentUserId: () => {
      const state = get();
      return state.user?.id ?? null;
    },
  }))
);

/**
 * Selectors
 */
export const selectIsAuthenticated = (state: AuthState) =>
  !!state.user && !!state.session && state.session.status === "active";

export const selectHasOrg = (state: AuthState) => !!state.org;

export const selectCurrentOrgId = (state: AuthState) => state.org?.id ?? null;
