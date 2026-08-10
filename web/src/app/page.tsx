import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// proxy.ts already redirects "/" before this renders; this is a defense-in-depth fallback.
export default async function RootPage() {
  const session = await getSession();
  redirect(session ? "/assets" : "/login");
}
