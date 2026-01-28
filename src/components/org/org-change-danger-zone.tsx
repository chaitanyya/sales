import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconAlertCircle, IconAlertTriangle, IconInfo, IconLoader2 } from "@tabler/icons-react";
import type { OrgBinding } from "@/lib/tauri/types";

interface OrgChangeDangerZoneProps {
  currentBinding: OrgBinding;
  onChanged: (newBinding: OrgBinding) => void;
}

export function OrgChangeDangerZone({ currentBinding, onChanged }: OrgChangeDangerZoneProps) {
  const { user, orgMemberships } = useAuthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [backupPath, setBackupPath] = useState<string | null>(null);

  const otherOrgs = orgMemberships.filter((m) => m.organization.id !== currentBinding.orgId);

  const handleChangeOrg = async () => {
    if (!user || !selectedOrgId || confirmText !== "DELETE ALL DATA") return;

    setIsProcessing(true);
    setError(null);
    setBackupPath(null);

    try {
      const selectedMembership = orgMemberships.find((m) => m.organization.id === selectedOrgId);
      if (!selectedMembership) {
        throw new Error("Selected organization not found");
      }

      const newBinding = await invoke<OrgBinding>("change_org_binding", {
        newOrgId: selectedMembership.organization.id,
        newOrgName: selectedMembership.organization.name,
        userId: user.id,
        userEmail: user.emailAddress ?? user.firstName ?? user.id,
        confirmWipe: true,
      });

      onChanged(newBinding);
      setIsDialogOpen(false);
      setConfirmText("");
      setSelectedOrgId(null);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsProcessing(false);
    }
  };

  const canConfirm = user && selectedOrgId && confirmText === "DELETE ALL DATA" && !isProcessing;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Change Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconAlertTriangle className="h-5 w-5 text-destructive" />
            Change Organization
          </DialogTitle>
          <DialogDescription className="text-destructive font-medium">
            Warning: This action will delete all your data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current binding */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">CURRENTLY LINKED TO</p>
            <p className="font-medium">{currentBinding.orgName}</p>
            <p className="text-xs text-muted-foreground">Linked {new Date(currentBinding.boundAt * 1000).toLocaleDateString()}</p>
          </div>

          {/* Warning message */}
          <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <IconAlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">
              <p className="font-medium mb-1">This action cannot be undone</p>
              <p className="text-destructive/80">
                Changing organizations will permanently delete all leads, people, scores, and jobs from this installation.
                A backup will be created automatically.
              </p>
            </div>
          </div>

          {/* Select new org */}
          {otherOrgs.length > 0 ? (
            <div className="space-y-2">
              <Label>Select New Organization</Label>
              <div className="space-y-2">
                {otherOrgs.map((membership) => (
                  <button
                    key={membership.organization.id}
                    type="button"
                    onClick={() => setSelectedOrgId(membership.organization.id)}
                    disabled={isProcessing}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      selectedOrgId === membership.organization.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
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
          ) : (
            <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground text-center">
              No other organizations available
            </div>
          )}

          {/* Confirmation input */}
          {selectedOrgId && (
            <div className="space-y-2">
              <Label htmlFor="confirm">Type "DELETE ALL DATA" to confirm</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE ALL DATA"
                disabled={isProcessing}
                className="font-mono"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <IconAlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Backup info */}
          {backupPath && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
              <IconInfo className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">Backup Created</p>
                <p className="text-muted-foreground text-xs break-all">{backupPath}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsDialogOpen(false);
              setConfirmText("");
              setSelectedOrgId(null);
              setError(null);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!canConfirm}
              >
                {isProcessing ? (
                  <>
                    <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Organization"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your leads, people, scores, and jobs. A backup will be created at:
                  <br /><br />
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    ~/Library/Application Support/liidi/backups/
                  </code>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleChangeOrg}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Delete All Data & Change Org
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
