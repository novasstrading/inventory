import { AccessView } from "@/components/admin/access-view";
import { requirePageAdmin } from "@/lib/auth/session";

export default async function AccessPage() {
  await requirePageAdmin();
  return <AccessView />;
}
