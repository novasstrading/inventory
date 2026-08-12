"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { withBasePath } from "@/lib/base-path";
import { OtpInput } from "./otp-input";

const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_EMAIL_DOMAIN ?? "novasstrading.com";
const RESEND_SECONDS = 60;

export function LoginCard() {
  const router = useRouter();
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [local, setLocal] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [codeError, setCodeError] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function requestCode(isResend = false) {
    const candidate = local.trim().replace(/[@\s]/g, "");
    const fullEmail = candidate ? `${candidate}@${EMAIL_DOMAIN}` : email;
    if (!fullEmail) return toast.error("Enter your name before the @.");
    setEmail(fullEmail);
    setSending(true);
    try {
      const data = await apiFetch<{ message: string }>("/api/auth/request-code", { body: { email: fullEmail } });
      setStep("code");
      setCooldown(RESEND_SECONDS);
      toast.success(isResend ? "New code sent." : data.message || "Code sent!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send code.");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(value: string) {
    if (value.length < 6) return toast.error("Enter all 6 digits.");
    setVerifying(true);
    try {
      await apiFetch("/api/auth/verify-code", { body: { email, code: value } });
      toast.success("Signed in!");
      router.push("/assets");
      router.refresh();
    } catch (e) {
      setCodeError(true);
      setTimeout(() => setCodeError(false), 650);
      toast.error(e instanceof Error ? e.message : "Incorrect code.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center p-5">
      <div className="w-full max-w-[430px] overflow-hidden rounded-2xl bg-panel shadow-[0_12px_40px_rgba(16,26,38,.14)]">
        <div className="relative bg-gradient-to-br from-navy to-navy-3 px-8 pb-7 pt-9 text-center">
          <div className="mx-auto mb-3.5 flex h-[76px] w-[76px] items-center justify-center rounded-2xl bg-white p-2.5 shadow-lg">
            <Image src={withBasePath("/logo-icon.png")} alt="Nova SS Trading" width={56} height={56} className="object-contain" />
          </div>
          <h1 className="text-lg font-extrabold tracking-wide text-white">NOVA SS TRADING</h1>
          <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-gold-2">Asset Manager</p>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gold to-gold-2" />
        </div>

        <div className="px-8 pb-8 pt-7">
          {step === "email" ? (
            <>
              <h2 className="mb-1.5 text-xl font-bold text-ink">Sign in</h2>
              <p className="mb-5 text-[13.5px] leading-relaxed text-muted-foreground">
                Authorized staff only. We&apos;ll email you a one-time sign-in code.
              </p>
              <div className="mb-4">
                <Label htmlFor="loginEmail">Work email</Label>
                <div className="flex items-stretch overflow-hidden rounded-md border-[1.5px] border-input bg-white focus-within:border-navy focus-within:ring-[3px] focus-within:ring-navy/10">
                  <input
                    id="loginEmail"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="yourname"
                    maxLength={40}
                    value={local}
                    onChange={(e) => setLocal(e.target.value.replace(/[@\s]/g, "").toLowerCase())}
                    onKeyDown={(e) => e.key === "Enter" && requestCode()}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink outline-none"
                  />
                  <div className="flex items-center border-l border-line-2 bg-[#F8FAFC] px-3 text-[13.5px] font-medium text-muted-foreground">
                    @{EMAIL_DOMAIN}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Button variant="primary" size="lg" className="min-w-[220px]" disabled={sending} onClick={() => requestCode()}>
                  {sending ? "Sending…" : "Send sign-in code"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4.5 rounded-[10px] bg-gold-soft px-4 py-3 text-[13px] text-ink-2">
                Code sent to <b>{email}</b>
              </div>
              <Label>6-digit code from email</Label>
              <div className="mb-3 mt-1.5">
                <OtpInput value={code} onChange={setCode} error={codeError} onSubmit={verifyCode} />
              </div>
              <div className="mb-3 text-center">
                <Button
                  variant="primary"
                  size="lg"
                  className="min-w-[220px]"
                  disabled={verifying}
                  onClick={() => verifyCode(code)}
                >
                  {verifying ? "Verifying…" : "Verify & sign in"}
                </Button>
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  className="p-1 text-xs font-semibold text-muted-foreground hover:text-navy hover:underline"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                >
                  ← Different email
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0}
                  className="p-1 text-xs font-semibold text-muted-foreground hover:text-navy hover:underline disabled:opacity-50 disabled:hover:no-underline"
                  onClick={() => requestCode(true)}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
