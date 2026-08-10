"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import type { Employee } from "@/lib/types";

export function ReleaseEmployeeDialog({
  open,
  onOpenChange,
  employee,
  heldCount,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  heldCount: number;
  onDone: () => Promise<void> | void;
}) {
  const [note, setNote] = React.useState("");
  const [reassign, setReassign] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNote("");
      setReassign(true);
    }
  }, [open]);

  if (!employee) return null;

  async function submit() {
    setSaving(true);
    try {
      const data = await apiFetch<{ reassignedCount: number }>(`/api/employees/${employee!.id}/release`, {
        body: { note, reassignAssetsToOffice: reassign },
      });
      toast.success(
        data.reassignedCount > 0
          ? `Released — ${data.reassignedCount} asset(s) returned to Office.`
          : "Employee released.",
      );
      onOpenChange(false);
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not release employee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Release {employee.name}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="mb-3.5 text-sm leading-relaxed text-muted-foreground">
            This marks them as released (reversible — see the Reinstate action later) rather than deleting their
            record, so asset history stays intact.
          </p>
          {heldCount > 0 && (
            <div className="mb-3.5 rounded-md bg-gold-soft px-3.5 py-2.5 text-[13px] text-ink-2">
              Currently holding <b>{heldCount}</b> asset{heldCount === 1 ? "" : "s"}.
            </div>
          )}
          <label className="mb-3.5 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={reassign}
              onChange={(e) => setReassign(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Return their assets to Office automatically
              <div className="text-xs text-muted-foreground">
                Unchecked: assets stay assigned to {employee.name} and are flagged for manual reassignment.
              </div>
            </span>
          </label>
          <div className="mb-1">
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for release…" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={saving} onClick={submit}>
            {saving ? "Releasing…" : "Release employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
