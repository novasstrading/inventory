"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import type { Location } from "@/lib/types";
import { LocationsManagerDialog } from "./locations-manager-dialog";

const CUSTOM_SENTINEL = "__custom__";

export function LocationPicker({
  value,
  onChange,
  locations,
  isAdmin,
  onLocationsChanged,
  allowBlank = true,
  blankLabel = "— Not set —",
}: {
  value: string;
  onChange: (value: string) => void;
  locations: Location[];
  isAdmin: boolean;
  onLocationsChanged: () => Promise<void> | void;
  allowBlank?: boolean;
  blankLabel?: string;
}) {
  const knownNames = React.useMemo(() => new Set(locations.map((l) => l.name)), [locations]);
  const [customMode, setCustomMode] = React.useState(() => !!value && !knownNames.has(value));
  const [remember, setRemember] = React.useState(true);
  const [manageOpen, setManageOpen] = React.useState(false);

  React.useEffect(() => {
    setCustomMode(!!value && !knownNames.has(value));
  }, [value, knownNames]);

  async function commitCustomValue() {
    const trimmed = value.trim();
    if (!remember || !trimmed || knownNames.has(trimmed) || !isAdmin) return;
    try {
      await apiFetch("/api/locations", { body: { name: trimmed } });
      await onLocationsChanged();
    } catch {
      // Duplicate or transient failure — the typed value is still used for this asset either way.
    }
  }

  if (customMode) {
    return (
      <div>
        <div className="flex gap-1.5">
          <Input value={value} onChange={(e) => onChange(e.target.value)} onBlur={commitCustomValue} placeholder="Type a location…" />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCustomMode(false);
              onChange("");
            }}
          >
            List
          </Button>
        </div>
        {isAdmin && (
          <label className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Save to location list for reuse
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Select
        value={value}
        onChange={(e) => {
          if (e.target.value === CUSTOM_SENTINEL) {
            setCustomMode(true);
            onChange("");
          } else {
            onChange(e.target.value);
          }
        }}
      >
        {allowBlank && <option value="">{blankLabel}</option>}
        {locations.map((l) => (
          <option key={l.id} value={l.name}>
            {l.name}
          </option>
        ))}
        <option value={CUSTOM_SENTINEL}>+ Type a new location…</option>
      </Select>
      {isAdmin && (
        <Button type="button" variant="outline" size="icon" onClick={() => setManageOpen(true)} title="Manage locations">
          ⚙
        </Button>
      )}
      <LocationsManagerDialog open={manageOpen} onOpenChange={setManageOpen} locations={locations} onChanged={onLocationsChanged} />
    </div>
  );
}
