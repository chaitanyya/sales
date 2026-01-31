"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IconSearch, IconLoader2 } from "@tabler/icons-react";
import { startFindLeads } from "@/lib/tauri/commands";
import { handleStreamEvent } from "@/lib/stream/handle-stream-event";
import { toast } from "sonner";

interface FindLeadsModalProps {
  onSuccess?: () => void;
}

export function FindLeadsModal({ onSuccess }: FindLeadsModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [icpDescription, setIcpDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icpDescription.trim()) return;

    setLoading(true);
    try {
      await startFindLeads(icpDescription.trim(), handleStreamEvent);
      setOpen(false);
      setIcpDescription("");
      onSuccess?.();
      toast.success("Lead finder started");
    } catch {
      toast.error("Failed to start lead finder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <IconSearch className="w-3.5 h-3.5" />
          Find Leads
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Find Leads</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="icpDescription">Ideal Customer Profile</Label>
            <Textarea
              id="icpDescription"
              value={icpDescription}
              onChange={(e) => setIcpDescription(e.target.value)}
              placeholder="e.g. B2B SaaS companies in San Francisco, 50-200 employees, selling to enterprise"
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !icpDescription.trim()}>
              {loading && <IconLoader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Starting..." : "Find Leads"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
