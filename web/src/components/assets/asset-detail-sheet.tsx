"use client";

import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api-client";
import type { Asset, Employee, Transfer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DocumentGallery, PhotoGallery } from "./attachments-gallery";
import { StickerDialog } from "./sticker-dialog";

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words text-ink-2">{value}</dd>
    </>
  );
}

export function AssetDetailSheet({
  open,
  onOpenChange,
  asset,
  employees,
  isAdmin,
  onEdit,
  onTransfer,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  employees: Employee[];
  isAdmin: boolean;
  onEdit: (asset: Asset) => void;
  onTransfer: (asset: Asset) => void;
  onChanged: () => Promise<void> | void;
}) {
  const [transfers, setTransfers] = React.useState<Transfer[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [stickerOpen, setStickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open || !asset) return;
    apiFetch<{ transfers: Transfer[] }>(`/api/assets/${asset.id}/transfers`)
      .then((d) => setTransfers(d.transfers))
      .catch(() => setTransfers([]));
  }, [open, asset]);

  if (!asset) return null;
  const holder = employees.find((e) => e.id === asset.employeeId)?.name ?? "Office";

  async function toggleRemoved() {
    const restore = asset!.status === "removed";
    if (!restore && !confirm("Mark this asset as removed? Its sticker code stays reserved forever.")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/assets/${asset!.id}/remove`, { method: "POST", body: { restore } });
      toast.success(restore ? "Restored." : "Removed.");
      await onChanged();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          {asset.code && <span className="font-mono text-[15px] font-bold text-navy">{asset.code}</span>}
          <Badge variant={asset.type}>{asset.category}</Badge>
          <div className="flex-1" />
          <Badge variant={asset.status}>{asset.status}</Badge>
          <SheetClose />
        </SheetHeader>
        <SheetBody>
          <SheetTitle>{asset.name}</SheetTitle>
          {asset.brandModel && <div className="mt-1 text-muted-foreground">{asset.brandModel}</div>}

          {isAdmin && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={() => onEdit(asset)}>
                ✏️ Edit
              </Button>
              {asset.code && (
                <Button variant="gold" size="sm" onClick={() => setStickerOpen(true)}>
                  🏷️ Sticker
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onTransfer(asset)}>
                ↔ Transfer
              </Button>
              <Button variant={asset.status === "active" ? "danger" : "default"} size="sm" disabled={busy} onClick={toggleRemoved}>
                {asset.status === "active" ? "Remove" : "Restore"}
              </Button>
            </div>
          )}

          <dl className="mt-4.5 grid grid-cols-[120px_1fr] gap-x-3.5 gap-y-2 text-[13.5px]">
            <Kv label="Serial" value={asset.serial} />
            <Kv label="Specs" value={asset.specs} />
            <Kv label="Vendor" value={asset.vendor} />
            <Kv label="Purchased" value={asset.purchaseDate} />
            {asset.valueAmount && (
              <>
                <dt className="text-muted-foreground">Value</dt>
                <dd className="text-ink-2">
                  {asset.valueAmount} {asset.valueCurrency}
                  {asset.valueType !== "one_time" && (
                    <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {asset.valueType}
                    </span>
                  )}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Assigned to</dt>
            <dd className="text-ink-2">{holder}</dd>
            <Kv label="Location" value={asset.location} />
            <Kv label="Notes" value={asset.notes} />
            <dt className="text-muted-foreground">Added</dt>
            <dd className="text-ink-2">{fmt(asset.createdAt)}</dd>
          </dl>

          <div className="mt-6 border-t border-border pt-4">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Transfer history
            </div>
            {transfers.length === 0 ? (
              <div className="text-muted-foreground">No transfers recorded.</div>
            ) : (
              <ul className="list-none p-0">
                {transfers.map((t) => (
                  <li key={t.id} className={cn("border-b border-line-2 py-2.5 text-[13.5px] last:border-0")}>
                    <b>{t.fromLabel || "Office"}</b> → <b>{t.toLabel || "Office"}</b>
                    {t.toLocation && <span className="text-muted-foreground"> · {t.toLocation}</span>}
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {fmt(t.createdAt)}
                      {t.byEmail ? ` · by ${t.byEmail}` : ""}
                      {t.notes ? ` · ${t.notes}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <PhotoGallery assetId={asset.id} isAdmin={isAdmin} />
          <DocumentGallery assetId={asset.id} isAdmin={isAdmin} />
        </SheetBody>
      </SheetContent>
      <StickerDialog open={stickerOpen} onOpenChange={setStickerOpen} asset={asset} isAdmin={isAdmin} />
    </Sheet>
  );
}
