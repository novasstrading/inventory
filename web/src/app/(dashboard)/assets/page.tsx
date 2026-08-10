import { Card } from "@/components/ui/card";

// Full asset table/filters/stats land in M2 — this placeholder exists so the
// authenticated shell (header, tabs, role gating) is end-to-end testable in M1.
export default function AssetsPage() {
  return (
    <Card className="p-10 text-center text-muted-foreground">
      <div className="mb-2 text-4xl">📦</div>
      Asset inventory management lands in the next milestone.
    </Card>
  );
}
