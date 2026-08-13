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
import type { Asset, Employee, Location } from "@/lib/types";
import { LocationPicker } from "./location-picker";

export function TransferDialog({
  open,
  onOpenChange,
  asset,
  employees,
  locations,
  onLocationsChanged,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  employees: Employee[];
  locations: Location[];
  onLocationsChanged: () => Promise<void> | void;
  onDone: () => Promise<void> | void;
}) {
  const [employeeId, setEmployeeId] = React.useState("");
  const [toLocation, setToLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEmployeeId(asset?.employeeId ?? "");
      setToLocation("");
      setNotes("");
    }
  }, [open, asset]);

  if (!asset) return null;
  const currentHolder = employees.find((e) => e.id === asset.employeeId)?.name ?? "Office";

  async function submit() {
    setSaving(true);
    try {
      await apiFetch(`/api/assets/${asset!.id}/transfer`, {
        method: "POST",
        body: { employeeId, toLocation, notes },
      });
      toast.success("Transfer recorded.");
      onOpenChange(false);
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record transfer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer asset</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="mb-3.5 rounded-md bg-bg px-3.5 py-2.5 text-[13px]">
            {asset.code && <span className="font-mono font-bold text-navy">{asset.code}</span>} {asset.name}
            <br />
            <span className="text-muted-foreground">
              Currently held by: <b className="text-foreground">{currentHolder}</b>
            </span>
          </div>
          <div className="mb-3">
            <Label>Transfer to</Label>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">🏢 Office (unassigned)</option>
              {employees
                .filter((e) => e.status === "active")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.designation ? ` — ${e.designation}` : ""}
                  </option>
                ))}
            </Select>
          </div>
          <div className="mb-3">
            <Label>New location (optional)</Label>
            <LocationPicker
              value={toLocation}
              onChange={setToLocation}
              locations={locations}
              isAdmin
              onLocationsChanged={onLocationsChanged}
              blankLabel="— Keep current location —"
            />
          </div>
          <div className="mb-3">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason, condition…" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={submit}>
            {saving ? "Recording…" : "Record transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
