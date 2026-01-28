import * as React from "react";
import { IconLock, IconLoader2 } from "@tabler/icons-react";
import { useSubscriptionStore } from "@/lib/store/subscription-store";
import { useEffect } from "react";

export function SubscriptionLock() {
  const {
    isLockedOut,
    lockoutReason,
    gracePeriodEndsAt,
    checkLockout,
  } = useSubscriptionStore();

  useEffect(() => {
    // Check lockout status on mount
    checkLockout();
  }, [checkLockout]);

  if (!isLockedOut) {
    return null;
  }

  const daysRemaining =
    gracePeriodEndsAt && gracePeriodEndsAt > 0
      ? Math.ceil((gracePeriodEndsAt - Date.now() / 1000) / (24 * 60 * 60))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 text-center space-y-6 p-8 rounded-lg border bg-card">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <IconLock className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Subscription Required</h1>
          <p className="text-muted-foreground">{lockoutReason || "Your subscription has expired. Please renew to continue using Liidi."}</p>
        </div>

        {daysRemaining > 0 && (
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">
              Grace period ends in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.open("https://liidi.app/billing", "_blank")}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Manage Subscription
          </button>
          <button
            onClick={checkLockout}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state for subscription check
 */
export function SubscriptionLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <IconLoader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking subscription...</p>
      </div>
    </div>
  );
}
