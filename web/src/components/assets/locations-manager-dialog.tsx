"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import type { Location } from "@/lib/types";

export function LocationsManagerDialog({
  open,
  onOpenChange,
  locations,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  onChanged: () => Promise<void> | void;
}) {
  const [deleting, setDeleting] = React.useState<Location | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/api/locations/${deleting.id}/delete`, { method: "POST" });
      toast.success("Location removed.");
      setDeleting(null);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete location.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage locations</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {locations.length === 0 ? (
            <div className="text-sm text-muted-foreground">No locations yet.</div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {locations.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <span className="text-ink-2">{l.name}</span>
                  <Button variant="ghost" size="xs" className="text-danger" onClick={() => setDeleting(l)}>
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this location?"
        description={
          deleting ? (
            <>
              Remove <b className="text-foreground">{deleting.name}</b> from the location list? This only works if
              no asset currently uses it — otherwise reassign those first.
            </>
          ) : null
        }
        confirmLabel="Delete"
        loading={busy}
        onConfirm={confirmDelete}
      />
    </Dialog>
  );
}
