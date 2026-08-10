import { AssetsView } from "@/components/assets/assets-view";
import { requirePageSession } from "@/lib/auth/session";

export default async function AssetsPage() {
  const session = await requirePageSession();
  return <AssetsView isAdmin={session.role === "admin"} />;
}
