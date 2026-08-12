"use client";

import * as React from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
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
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-[110px] w-[220px] items-center justify-center overflow-hidden rounded-lg border border-border bg-bg">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated proxy blob URL
          <img src={src} alt={sticker.label} className="block w-full" />
        ) : (
          <span className="text-xs text-muted-foreground">Loading…</span>
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
      load();
    }
  }, [open, load]);

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
            <div className="mb-2 text-sm text-muted-foreground">No stickers generated yet for this item.</div>
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
              <p className="mb-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Each label can only be generated <b>once</b> and is then permanently saved — it can be downloaded
                again anytime, but not regenerated. To print another physical sticker for this item (e.g. one for
                the box, one for the charger), enter a new, different label below.
              </p>
              <div className="flex gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Laptop body, Box, Charger"
                />
                <Button variant="gold" disabled={generating} onClick={generate}>
                  {generating ? "Generating…" : "Generate"}
                </Button>
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
