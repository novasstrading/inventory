"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { withBasePath } from "@/lib/base-path";
import type { Doc, Photo } from "@/lib/types";
import { cn } from "@/lib/utils";

/** `url` is app-relative (e.g. "/api/assets/x/photos/y") — this component applies the basePath. */
function Thumb({ url, alt, isPdf, label }: { url: string; alt: string; isPdf: boolean; label?: string }) {
  const [src, setSrc] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (isPdf) return;
    let revoke: string | null = null;
    fetch(withBasePath(url))
      .then((r) => r.blob())
      .then((b) => {
        const u = URL.createObjectURL(b);
        revoke = u;
        setSrc(u);
      })
      .catch(() => undefined);
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [url, isPdf]);

  if (isPdf) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1.5 p-1.5 text-center text-[10.5px] font-semibold text-muted-foreground">
        <div className="text-[30px]">📄</div>
        <div className="line-clamp-2">{label}</div>
      </div>
    );
  }
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- authenticated proxy blob URL
    <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
  ) : (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">…</div>
  );
}

export function PhotoGallery({ assetId, isAdmin }: { assetId: string; isAdmin: boolean }) {
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [showDeleted, setShowDeleted] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await apiFetch<{ photos: Photo[] }>(`/api/assets/${assetId}/photos`);
      setPhotos(data.photos);
    } catch {
      setPhotos([]);
    }
  }, [assetId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File) {
    if (!file.size) return toast.error("That file is empty.");
    const fd = new FormData();
    fd.append("photo", file, file.name);
    try {
      const res = await fetch(withBasePath(`/api/assets/${assetId}/photos`), { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Upload failed.");
      toast.success("Photo added.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo.");
    }
  }

  async function toggle(photoId: string, del: boolean) {
    try {
      await apiFetch(`/api/assets/${assetId}/photos/${photoId}/delete`, { body: { restore: !del } });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update photo.");
    }
  }

  const visible = photos.filter((p) => showDeleted || !p.deleted);

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Photos</div>
        {isAdmin && (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="xs" onClick={() => setShowDeleted((s) => !s)}>
              {showDeleted ? "Hide deleted" : "Show deleted"}
            </Button>
            <label className="cursor-pointer rounded-md bg-navy px-2.5 py-1 text-[11.5px] font-semibold text-white">
              + Photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </div>
        )}
      </div>
      {visible.length === 0 ? (
        <div className="text-sm text-muted-foreground">No photos yet.</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2.5">
          {visible.map((p) => (
            <div key={p.id} className={cn("group relative aspect-square overflow-hidden rounded-[10px] border border-border bg-muted", p.deleted && "grayscale opacity-40")}>
              {p.deleted && (
                <span className="absolute left-1.5 top-1.5 z-10 rounded bg-danger px-1.5 py-0.5 text-[9px] font-semibold text-white">deleted</span>
              )}
              <Thumb url={`/api/assets/${assetId}/photos/${p.id}`} alt="" isPdf={false} />
              {isAdmin && (
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant={p.deleted ? "default" : "danger"} size="xs" onClick={() => toggle(p.id, !p.deleted)}>
                    {p.deleted ? "Restore" : "Delete"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentGallery({ assetId, isAdmin }: { assetId: string; isAdmin: boolean }) {
  const [docs, setDocs] = React.useState<Doc[]>([]);

  const load = React.useCallback(async () => {
    try {
      const data = await apiFetch<{ documents: Doc[] }>(`/api/assets/${assetId}/documents`);
      setDocs(data.documents.filter((d) => !d.deleted));
    } catch {
      setDocs([]);
    }
  }, [assetId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File) {
    if (!file.size) return toast.error("That file is empty.");
    const fd = new FormData();
    fd.append("doc", file, file.name);
    try {
      const res = await fetch(withBasePath(`/api/assets/${assetId}/documents`), { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Upload failed.");
      toast.success("Document added.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload document.");
    }
  }

  async function remove(docId: string) {
    try {
      await apiFetch(`/api/assets/${assetId}/documents/${docId}/delete`, { body: {} });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete document.");
    }
  }

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Documents / Invoices</div>
        {isAdmin && (
          <label className="cursor-pointer rounded-md bg-navy px-2.5 py-1 text-[11.5px] font-semibold text-white">
            + PDF / Image
            <input
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
        )}
      </div>
      {docs.length === 0 ? (
        <div className="text-sm text-muted-foreground">No documents yet.</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2.5">
          {docs.map((d) => (
            <div key={d.id} className="group relative aspect-square overflow-hidden rounded-[10px] border border-border bg-muted" title={d.originalName}>
              <Thumb url={`/api/assets/${assetId}/documents/${d.id}`} alt="" isPdf={d.docType === "pdf"} label={d.originalName} />
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <a href={withBasePath(`/api/assets/${assetId}/documents/${d.id}`)} target="_blank" rel="noreferrer">
                  <Button size="xs">Open</Button>
                </a>
                {isAdmin && (
                  <Button variant="danger" size="xs" onClick={() => remove(d.id)}>
                    Del
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
