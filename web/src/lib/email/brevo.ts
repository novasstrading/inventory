import "server-only";
import { otpEmail, userAddedEmail, userRemovedEmail } from "./templates";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    // No provider configured (local dev without secrets) — log instead of failing the flow.
    console.warn(`[email:dev] "${subject}" -> ${to}\n${text}`);
    return;
  }

  const from = process.env.MAIL_FROM ?? "no-reply@novasstrading.com";
  const fromName = process.env.MAIL_FROM_NAME ?? "Nova SS Asset Manager";

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { email: from, name: fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to send email (${res.status}): ${body}`);
  }
}

export async function sendOtpEmail(email: string, code: string, ttlMinutes: number): Promise<void> {
  const { subject, html, text } = otpEmail(code, ttlMinutes);
  await sendEmail(email, subject, html, text);
}

export async function sendUserAddedEmail(email: string, role: "admin" | "viewer", byEmail: string): Promise<void> {
  const { subject, html, text } = userAddedEmail(role, byEmail);
  await sendEmail(email, subject, html, text);
}

export async function sendUserRemovedEmail(email: string, byEmail: string): Promise<void> {
  const { subject, html, text } = userRemovedEmail(byEmail);
  await sendEmail(email, subject, html, text);
}
