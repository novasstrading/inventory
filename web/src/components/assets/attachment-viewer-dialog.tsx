"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { withBasePath } from "@/lib/base-path";
import { downloadBlob } from "@/lib/download";

/** `url` is app-relative (e.g. "/api/assets/x/photos/y") — this component applies the basePath. */
export function AttachmentViewerDialog({
  open,
  onOpenChange,
  url,
  name,
  isPdf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  name: string;
  isPdf: boolean;
}) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setBlobUrl(null);
      return;
    }
    let revoke: string | null = null;
    fetch(withBasePath(url))
      .then((r) => r.blob())
      .then((b) => {
        const u = URL.createObjectURL(b);
        revoke = u;
        setBlobUrl(u);
      })
      .catch(() => toast.error("Could not load the file."));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, url]);

  async function download() {
    try {
      const res = await fetch(withBasePath(url));
      downloadBlob(await res.blob(), name);
    } catch {
      toast.error("Could not download the file.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{name}</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex items-center justify-center bg-bg p-2">
          {!blobUrl ? (
            <Skeleton className="h-[60vh] w-full" />
          ) : isPdf ? (
            <iframe src={blobUrl} title={name} className="h-[70vh] w-full rounded-md border border-border bg-white" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL, not a static app asset
            <img src={blobUrl} alt={name} className="max-h-[70vh] w-full rounded-md object-contain" />
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={download}>
            ⬇ Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
