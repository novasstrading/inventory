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
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import type { Asset, Employee } from "@/lib/types";

export function ReleaseEmployeeDialog({
  open,
  onOpenChange,
  employee,
  heldAssets,
  employees,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  /** Assets currently assigned to this employee — each must be resolved before release. */
  heldAssets: Asset[];
  employees: Employee[];
  onDone: () => Promise<void> | void;
}) {
  const [note, setNote] = React.useState("");
  // assetId -> destination employeeId ("" = Office)
  const [destinations, setDestinations] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNote("");
      setDestinations(Object.fromEntries(heldAssets.map((a) => [a.id, ""])));
    }
    // heldAssets is a fresh array every render from the parent's filter() — only reset on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id]);

  if (!employee) return null;

  const otherEmployees = employees.filter((e) => e.status === "active" && e.id !== employee.id);

  async function submit() {
    setSaving(true);
    try {
      const data = await apiFetch<{ reassignedCount: number }>(`/api/employees/${employee!.id}/release`, {
        body: {
          note,
          reassignments: heldAssets.map((a) => ({ assetId: a.id, employeeId: destinations[a.id] ?? "" })),
        },
      });
      toast.success(
        data.reassignedCount > 0
          ? `Released — ${data.reassignedCount} asset(s) reassigned.`
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

          {heldAssets.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 rounded-md bg-gold-soft px-3.5 py-2.5 text-[13px] text-ink-2">
                Currently holding <b>{heldAssets.length}</b> asset{heldAssets.length === 1 ? "" : "s"} — choose where
                each one goes before releasing.
              </div>
              <div className="flex flex-col gap-2.5">
                {heldAssets.map((a) => (
                  <div key={a.id} className="rounded-md border border-border p-2.5">
                    <div className="mb-1.5 text-[13px]">
                      {a.code && <span className="mr-1.5 font-mono text-[11.5px] font-bold text-navy">{a.code}</span>}
                      <span className="font-semibold text-ink">{a.name}</span>
                    </div>
                    <Select
                      value={destinations[a.id] ?? ""}
                      onChange={(e) => setDestinations((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    >
                      <option value="">🏢 Return to Office</option>
                      {otherEmployees.map((e) => (
                        <option key={e.id} value={e.id}>
                          Transfer to {e.name}
                          {e.designation ? ` — ${e.designation}` : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

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
