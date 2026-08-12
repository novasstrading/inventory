"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Asset } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AssetCard({
  asset,
  holderName,
  onOpen,
}: {
  asset: Asset;
  holderName: string;
  onOpen: () => void;
}) {
  return (
    <Card
      hoverable
      onClick={onOpen}
      className={cn("flex items-center gap-3 p-3.5", asset.status === "removed" && "opacity-50")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {asset.code && <span className="font-mono text-[11px] font-bold tracking-wide text-navy">{asset.code}</span>}
          <Badge variant={asset.type}>{asset.category}</Badge>
        </div>
        <div className="mt-1 truncate font-semibold text-ink">{asset.name}</div>
        {asset.brandModel && <div className="truncate text-[11.5px] text-muted-foreground">{asset.brandModel}</div>}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span>{asset.employeeId ? holderName || "—" : "Office"}</span>
          {asset.location && (
            <>
              <span>·</span>
              <span className="truncate">{asset.location}</span>
            </>
          )}
        </div>
      </div>
      <Badge variant={asset.status}>{asset.status}</Badge>
    </Card>
  );
}
