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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { Asset, Category, Employee } from "@/lib/types";
import { cn } from "@/lib/utils";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full mb-1.5 mt-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground first:mt-0">
      {children}
    </div>
  );
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  categories,
  employees,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  categories: Category[];
  employees: Employee[];
  onSaved: () => Promise<void> | void;
}) {
  const isEdit = !!asset;
  const [category, setCategory] = React.useState(asset?.category ?? categories[0]?.name ?? "");
  const [name, setName] = React.useState(asset?.name ?? "");
  const [brandModel, setBrandModel] = React.useState(asset?.brandModel ?? "");
  const [serial, setSerial] = React.useState(asset?.serial ?? "");
  const [specs, setSpecs] = React.useState(asset?.specs ?? "");
  const [vendor, setVendor] = React.useState(asset?.vendor ?? "");
  const [purchaseDate, setPurchaseDate] = React.useState(asset?.purchaseDate ?? "");
  const [valueAmount, setValueAmount] = React.useState(asset?.valueAmount ?? "");
  const [valueCurrency, setValueCurrency] = React.useState(asset?.valueCurrency ?? "BDT");
  const [valueType, setValueType] = React.useState(asset?.valueType ?? "one_time");
  const [employeeId, setEmployeeId] = React.useState(asset?.employeeId ?? "");
  const [location, setLocation] = React.useState(asset?.location ?? "");
  const [notes, setNotes] = React.useState(asset?.notes ?? "");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setCategory(asset?.category ?? categories[0]?.name ?? "");
    setName(asset?.name ?? "");
    setBrandModel(asset?.brandModel ?? "");
    setSerial(asset?.serial ?? "");
    setSpecs(asset?.specs ?? "");
    setVendor(asset?.vendor ?? "");
    setPurchaseDate(asset?.purchaseDate ?? "");
    setValueAmount(asset?.valueAmount ?? "");
    setValueCurrency(asset?.valueCurrency ?? "BDT");
    setValueType(asset?.valueType ?? "one_time");
    setEmployeeId(asset?.employeeId ?? "");
    setLocation(asset?.location ?? "");
    setNotes(asset?.notes ?? "");
    setErrors({});
  }, [open, asset, categories]);

  async function save() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Name is required.";
    if (!isEdit && !category) nextErrors.category = "Pick a category.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        brandModel,
        serial,
        specs,
        vendor,
        purchaseDate,
        valueAmount,
        valueCurrency,
        valueType,
        employeeId,
        location,
        notes,
        name,
      };
      if (isEdit) {
        await apiFetch(`/api/assets/${asset.id}`, { method: "PATCH", body: payload });
        toast.success("Saved.");
      } else {
        const data = await apiFetch<{ asset: Asset }>("/api/assets", { body: { ...payload, category } });
        toast.success(data.asset.code ? `Created — ${data.asset.code}` : "Created.");
      }
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const hardware = categories.filter((c) => c.kind === "hardware");
  const software = categories.filter((c) => c.kind === "software");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit asset" : "Add new asset"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {isEdit && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {asset.code && <span className="font-mono text-[15px] font-bold text-navy">{asset.code}</span>}
              <Badge variant={asset.type}>{asset.category}</Badge>
              <span className="text-xs text-muted-foreground">Code &amp; category locked after creation</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <SectionHeading>Identity</SectionHeading>
            {!isEdit && (
              <div className="col-span-full mb-3">
                <Label>Category *</Label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <optgroup label="Hardware">
                    {hardware.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Software">
                    {software.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </optgroup>
                </Select>
              </div>
            )}
            <div className="col-span-full mb-3">
              <Label>Name / title *</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Dell Latitude 5420"
                className={cn(errors.name && "border-danger animate-[shake_0.4s_ease-in-out]")}
              />
              {errors.name && <div className="mt-1 text-[11.5px] text-danger">{errors.name}</div>}
            </div>

            <SectionHeading>Specs &amp; vendor</SectionHeading>
            <div className="mb-3">
              <Label>Brand / model</Label>
              <Input value={brandModel} onChange={(e) => setBrandModel(e.target.value)} />
            </div>
            <div className="mb-3">
              <Label>Serial no.</Label>
              <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
            </div>
            <div className="col-span-full mb-3">
              <Label>Specs / plan details</Label>
              <Input value={specs} onChange={(e) => setSpecs(e.target.value)} placeholder="RAM, storage, licence key…" />
            </div>
            <div className="mb-3">
              <Label>Vendor</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </div>
            <div className="mb-3">
              <Label>Purchase date</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>

            <SectionHeading>Value</SectionHeading>
            <div className="col-span-full mb-3">
              <Label>Value / cost</Label>
              <div className="flex gap-1.5">
                <Input
                  value={valueAmount}
                  onChange={(e) => setValueAmount(e.target.value)}
                  placeholder="0"
                  className="flex-[1.2]"
                />
                <Select
                  value={valueCurrency}
                  onChange={(e) => setValueCurrency(e.target.value as "BDT" | "USD")}
                  className="w-24 flex-none"
                >
                  <option value="BDT">BDT</option>
                  <option value="USD">USD</option>
                </Select>
                <Select
                  value={valueType}
                  onChange={(e) => setValueType(e.target.value as typeof valueType)}
                  className="flex-1"
                >
                  <option value="one_time">One-time</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
            </div>

            <SectionHeading>Assignment &amp; notes</SectionHeading>
            <div className="col-span-full mb-3">
              <Label>Assigned to</Label>
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
            <div className="col-span-full mb-3">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Baridhara office…" />
            </div>
            <div className="col-span-full mb-3">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
