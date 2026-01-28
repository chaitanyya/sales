import { ReactNode, useEffect } from "react";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSubscriptionStore } from "@/lib/store/subscription-store";
import { useNavigate } from "react-router-dom";
import { IconLoader2 } from "@tabler/icons-react";
import { AuthLoadingPage } from "@/pages/auth/login";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard - Wraps protected routes
 *
 * This component:
 * 1. Checks if user is authenticated with Clerk
 * 2. Syncs Clerk auth state to our Zustand stores
 * 3. Syncs subscription data from user metadata
 * 4. Redirects to login if not authenticated
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const clerk = useClerk();
  const navigate = useNavigate();

  // Zustand stores
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);
  const setOrgMemberships = useAuthStore((state) => state.setOrgMemberships);
  const updateFromClerkMetadata = useSubscriptionStore((state) => state.updateFromClerkMetadata);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Sync Clerk user data to our auth store
  useEffect(() => {
    if (isAuthLoaded && isUserLoaded && user) {
      // Map Clerk user to our format
      setUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddresses?.[0]?.emailAddress || "",
        imageUrl: user.imageUrl,
        publicMetadata: user.publicMetadata as Record<string, unknown> || {},
        unsafeMetadata: user.unsafeMetadata as Record<string, unknown> || {},
      });

      // Get organization memberships
      const memberships = user.organizationMemberships?.map((m) => ({
        id: m.id,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug || "", // Handle null slug
          imageUrl: m.organization.imageUrl,
          publicMetadata: m.organization.publicMetadata as Record<string, unknown> || {},
        },
        role: m.role,
      })) || [];

      setOrgMemberships(memberships);

      // Update subscription from user metadata
      if (user.publicMetadata) {
        updateFromClerkMetadata(user.publicMetadata as Record<string, unknown>);
      }
    }
  }, [isAuthLoaded, isUserLoaded, user, setUser, setOrgMemberships, updateFromClerkMetadata]);

  // Sync session data
  useEffect(() => {
    if (isAuthLoaded) {
      const session = clerk.session;
      setSession(session ? {
        id: session.id,
        userId: session.user?.id || "", // Use user.id instead of non-existent userId
        status: session.status as "active" | "expired" | "revoked" | "abandoned",
        expireAt: session.expireAt?.getTime() || null,
      } : null);
    }
  }, [isAuthLoaded, clerk, setSession]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isAuthLoaded && isUserLoaded && !isSignedIn) {
      navigate("/auth/login", { replace: true });
    }
  }, [isAuthLoaded, isUserLoaded, isSignedIn, navigate]);

  // Show loading while Clerk initializes
  if (!isAuthLoaded || !isUserLoaded) {
    return <AuthLoadingPage />;
  }

  // Redirect to login if not signed in
  if (!isSignedIn) {
    return null; // Navigation will happen in useEffect
  }

  // Render protected content
  return <>{children}</>;
}

/**
 * Public Route Wrapper - Routes that don't require authentication
 * but should redirect authenticated users to the app
 */
interface PublicRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function PublicRoute({ children, redirectTo = "/lead" }: PublicRouteProps) {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { isLoaded: isUserLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthLoaded && isUserLoaded && isSignedIn) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthLoaded, isUserLoaded, isSignedIn, navigate, redirectTo]);

  // Show loading while checking auth
  if (!isAuthLoaded || !isUserLoaded) {
    return <AuthLoadingPage />;
  }

  // Render public content
  return <>{children}</>;
}
