import * as React from "react";
import { IconCheck, IconAlertTriangle, IconX, IconLoader2 } from "@tabler/icons-react";
import { useSubscriptionStore } from "@/lib/store/subscription-store";
import { useEffect, useState } from "react";

export function SubscriptionStatusIndicator() {
  const { status, getTierDisplay, isActive, isPastDue, isCancelled } = useSubscriptionStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [status]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <IconLoader2 className="w-4 h-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (isActive()) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="font-medium">{getTierDisplay()}</span>
        <span className="text-muted-foreground">Active</span>
      </div>
    );
  }

  if (isPastDue()) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <IconAlertTriangle className="w-4 h-4 text-yellow-500" />
        <span className="font-medium">{getTierDisplay()}</span>
        <span className="text-yellow-600 dark:text-yellow-500">Past Due</span>
      </div>
    );
  }

  if (isCancelled()) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <IconX className="w-4 h-4 text-destructive" />
        <span className="font-medium">{getTierDisplay()}</span>
        <span className="text-destructive">Canceled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium">{getTierDisplay()}</span>
      <span className="text-muted-foreground capitalize">{status}</span>
    </div>
  );
}

export function SubscriptionCard() {
  const {
    tier,
    status,
    expiresAt,
    getTierDisplay,
    isActive,
    isPastDue,
    isCancelled,
    gracePeriodEndsAt,
  } = useSubscriptionStore();

  const daysUntilExpiry = expiresAt
    ? Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  const daysUntilLockout = gracePeriodEndsAt
    ? Math.ceil((gracePeriodEndsAt - Date.now() / 1000) / (24 * 60 * 60))
    : null;

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Subscription</h3>
        <button
          onClick={() => window.open("https://liidi.app/billing", "_blank")}
          className="text-sm text-primary hover:underline"
        >
          Manage
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Plan</span>
          <span className="font-medium">{getTierDisplay()}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className={`capitalize ${
            isActive() ? "text-green-600 dark:text-green-500" :
            isPastDue() ? "text-yellow-600 dark:text-yellow-500" :
            isCancelled() ? "text-destructive" :
            "text-muted-foreground"
          }`}>
            {status}
          </span>
        </div>

        {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Expires</span>
            <span>
              {daysUntilExpiry === 0 ? "Today" :
               daysUntilExpiry === 1 ? "Tomorrow" :
               `In ${daysUntilExpiry} days`}
            </span>
          </div>
        )}

        {daysUntilLockout !== null && daysUntilLockout >= 0 && !isActive() && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Grace period ends</span>
            <span className="text-yellow-600 dark:text-yellow-500">
              {daysUntilLockout === 0 ? "Today" :
               daysUntilLockout === 1 ? "Tomorrow" :
               `In ${daysUntilLockout} days`}
            </span>
          </div>
        )}
      </div>

      {isActive() && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
            <IconCheck className="w-4 h-4" />
            <span>Your subscription is active</span>
          </div>
        </div>
      )}

      {!isActive() && daysUntilLockout !== null && daysUntilLockout > 0 && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500">
            <IconAlertTriangle className="w-4 h-4" />
            <span>
              {daysUntilLockout} day{daysUntilLockout !== 1 ? "s" : ""} left before access is locked
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
