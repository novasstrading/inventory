import { Card } from "@/components/ui/card";
import { requirePageAdmin } from "@/lib/auth/session";

// Full users/roles admin UI lands in M4. requirePageAdmin() here proves the
// role-gate works end-to-end: a viewer hitting /admin/access bounces to /assets.
export default async function AccessPage() {
  await requirePageAdmin();
  return (
    <Card className="p-10 text-center text-muted-foreground">
      <div className="mb-2 text-4xl">🔑</div>
      User access management lands in a later milestone.
    </Card>
  );
}
