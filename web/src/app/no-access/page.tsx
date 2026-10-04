import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";

// Set only when mounted behind the shared /admin door (see .env.example).
const MOUNTED = Boolean(process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL);

/** Where requirePageSession() sends a signed-in user who lacks the Assets module. */
export default async function NoAccessPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.modules.includes("assets")) redirect("/assets");

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-5">
      <Card className="w-full max-w-[400px] p-8 text-center">
        <div className="grad-navy mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-[0_8px_24px_rgba(0,30,70,.25)]">
          🔒
        </div>
        <h1 className="text-lg font-bold text-ink">No access to Assets</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your account (<b className="text-foreground">{session.email}</b>) doesn&apos;t have access to the Assets
          module. Ask an admin if you need it.
        </p>
        <div className="mt-6 flex justify-center gap-2.5">
          {MOUNTED && (
            <Button variant="primary" size="sm" asChild>
              {/* Plain <a>: /admin lives outside this app's basePath, so next/link would mis-prefix it. */}
              <a href="/admin">Back to admin home</a>
            </Button>
          )}
          <SignOutButton className="border-border text-ink-2" />
        </div>
      </Card>
    </div>
  );
}
