"use client";

import * as React from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { withBasePath } from "@/lib/base-path";
import { canvasToBlob, downloadBlob, renderStickerCanvas } from "@/lib/stickers/render";
import type { Asset, Sticker } from "@/lib/types";

function StickerThumb({ assetId, sticker }: { assetId: string; sticker: Sticker }) {
  const [src, setSrc] = React.useState<string | null>(null);
  React.useEffect(() => {
    let revoke: string | null = null;
    fetch(withBasePath(`/api/assets/${assetId}/stickers/${sticker.id}`))
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        revoke = url;
        setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [assetId, sticker.id]);

  async function download() {
    const res = await fetch(withBasePath(`/api/assets/${assetId}/stickers/${sticker.id}`));
    downloadBlob(await res.blob(), `sticker_${sticker.label.replace(/\s+/g, "-")}.png`);
  }

  return (
    <div className="hover-lift flex flex-col items-center gap-2 rounded-lg p-1.5">
      <div className="flex h-[110px] w-[220px] items-center justify-center overflow-hidden rounded-lg border border-border bg-bg">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated proxy blob URL
          <img src={src} alt={sticker.label} className="block w-full" />
        ) : (
          <Skeleton className="h-full w-full rounded-none" />
        )}
      </div>
      <div className="text-[12.5px] font-semibold text-ink-2">{sticker.label}</div>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="xs" onClick={download}>
          ⬇ Download
        </Button>
        <Badge variant="active">saved</Badge>
      </div>
    </div>
  );
}

export function StickerDialog({
  open,
  onOpenChange,
  asset,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  isAdmin: boolean;
}) {
  const [stickers, setStickers] = React.useState<Sticker[]>([]);
  const [newLabel, setNewLabel] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [confirmingGenerate, setConfirmingGenerate] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!asset) return;
    try {
      const data = await apiFetch<{ stickers: Sticker[] }>(`/api/assets/${asset.id}/stickers`);
      setStickers(data.stickers);
    } catch {
      setStickers([]);
    }
  }, [asset]);

  React.useEffect(() => {
    if (open) {
      setNewLabel("");
      setConfirmingGenerate(false);
      setPreviewUrl(null);
      load();
    }
  }, [open, load]);

  React.useEffect(() => {
    if (!open || !asset || !newLabel.trim()) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const canvas = await renderStickerCanvas(asset, newLabel.trim());
        if (cancelled) return;
        setPreviewUrl(canvas.toDataURL("image/png"));
      } catch {
        if (!cancelled) setPreviewUrl(null);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, asset, newLabel]);

  if (!asset) return null;

  async function generate() {
    if (!newLabel.trim()) return toast.error("Enter a label for this sticker.");
    setGenerating(true);
    try {
      const canvas = await renderStickerCanvas(asset!, newLabel.trim());
      const blob = await canvasToBlob(canvas);
      const fd = new FormData();
      fd.append("label", newLabel.trim());
      fd.append("png", blob, "sticker.png");
      const res = await fetch(withBasePath(`/api/assets/${asset!.id}/stickers`), { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Could not generate sticker.");
      downloadBlob(blob, `${asset!.code}_${newLabel.trim().replace(/\s+/g, "-")}.png`);
      toast.success("Sticker generated and saved.");
      setNewLabel("");
      setConfirmingGenerate(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate sticker.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Stickers</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="mb-4 rounded-md bg-bg px-3.5 py-2.5 text-[13px]">
            <span className="font-mono font-bold text-navy">{asset.code}</span> · {asset.name}
          </div>

          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Generated stickers
          </div>
          {stickers.length === 0 ? (
            <EmptyState
              className="py-8"
              title="No stickers yet"
              description="Generate the first physical label for this item using the form below."
            />
          ) : (
            <div className="mb-2 flex flex-wrap justify-center gap-3.5">
              {stickers.map((s) => (
                <StickerThumb key={s.id} assetId={asset.id} sticker={s} />
              ))}
            </div>
          )}

          {isAdmin && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Generate a new label
              </div>
              <Alert variant="warn" className="mb-3">
                Each label can only be generated <b>once</b> and is then permanently saved — it can be downloaded
                again anytime, but not regenerated. To print another physical sticker for this item (e.g. one for
                the box, one for the charger), enter a new, different label below.
              </Alert>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <Input
                    value={newLabel}
                    onChange={(e) => {
                      setNewLabel(e.target.value);
                      setConfirmingGenerate(false);
                    }}
                    placeholder="e.g. Laptop body, Box, Charger"
                  />
                  {!confirmingGenerate ? (
                    <Button
                      variant="gold"
                      className="mt-2 w-full sm:w-auto"
                      disabled={generating || !newLabel.trim()}
                      onClick={() => setConfirmingGenerate(true)}
                    >
                      Generate
                    </Button>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-danger/20 bg-danger-bg px-3 py-2">
                      <span className="text-[12px] text-danger">
                        Generate &ldquo;{newLabel.trim()}&rdquo; — this can&apos;t be undone.
                      </span>
                      <div className="ml-auto flex gap-1.5">
                        <Button variant="ghost" size="xs" onClick={() => setConfirmingGenerate(false)}>
                          Cancel
                        </Button>
                        <Button variant="danger" size="xs" disabled={generating} onClick={generate}>
                          {generating ? "Generating…" : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {previewUrl && (
                  <div className="flex flex-none flex-col items-center gap-1.5">
                    <div className="rounded-lg border border-border bg-white p-1.5 shadow-[0_4px_16px_rgba(16,26,38,.12)] [transform:rotate(-1deg)]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview, not an app asset */}
                      <img src={previewUrl} alt="Sticker preview" className="block h-[66px] w-[150px] object-contain" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Preview · 340×150 print size</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
