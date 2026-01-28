import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "@/lib/store/auth-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import type { OrgBinding } from "@/lib/tauri/types";

interface OrgRegistrationDialogProps {
  open: boolean;
  onComplete: (binding: OrgBinding) => void;
}

export function OrgRegistrationDialog({ open, onComplete }: OrgRegistrationDialogProps) {
  const { user, org, orgMemberships } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Auto-select the first org if available
  useEffect(() => {
    if (orgMemberships.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgMemberships[0].organization.id);
    }
  }, [orgMemberships, selectedOrgId]);

  const handleSubmit = async () => {
    if (!user || !selectedOrgId) return;

    setIsLoading(true);
    setError(null);

    try {
      const selectedMembership = orgMemberships.find((m) => m.organization.id === selectedOrgId);
      if (!selectedMembership) {
        throw new Error("Selected organization not found");
      }

      const binding = await invoke<OrgBinding>("bind_org", {
        orgId: selectedMembership.organization.id,
        orgName: selectedMembership.organization.name,
        userId: user.id,
        userEmail: user.emailAddress ?? user.firstName ?? user.id,
      });

      onComplete(binding);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = user && selectedOrgId && !isLoading;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to Zyntopia Liidi</DialogTitle>
          <DialogDescription>
            Before you can start using Zyntopia Liidi, we need to link this installation to your organization.
            This ensures your data stays synchronized across your team.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading your account...</p>
          </div>
        ) : orgMemberships.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <IconAlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-center text-muted-foreground">
              No organizations found. Please contact your administrator to be added to an organization.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org">Select Organization</Label>
              <div className="space-y-2">
                {orgMemberships.map((membership) => (
                  <button
                    key={membership.organization.id}
                    type="button"
                    onClick={() => setSelectedOrgId(membership.organization.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${selectedOrgId === membership.organization.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                      }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {membership.organization.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{membership.organization.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{membership.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>
                <strong>Note:</strong> This installation will be linked to the selected organization.
                Data cannot be shared between organizations.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <IconAlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              "Link Organization"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
