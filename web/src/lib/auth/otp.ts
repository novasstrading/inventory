import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { otpCodes, rateLimits, users } from "@/lib/db/schema";
import { sendOtpEmail } from "@/lib/email/brevo";
import { TooManyRequestsError, ValidationError } from "./errors";
import { parseModules, type ModuleKey } from "./modules";

export const OTP_LENGTH = 6;
export const OTP_TTL_MIN = 10;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  const max = 10 ** OTP_LENGTH;
  return String(randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

/** Fixed-window rate limiter backed by the rate_limits table — no Redis needed at this scale. */
async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.rlKey, key)).limit(1);

  if (!row || now.getTime() - row.windowStart.getTime() > windowSeconds * 1000) {
    await db
      .insert(rateLimits)
      .values({ rlKey: key, windowStart: now, count: 1 })
      .onDuplicateKeyUpdate({ set: { windowStart: now, count: 1 } });
    return true;
  }
  if (row.count >= limit) return false;
  await db.update(rateLimits).set({ count: row.count + 1 }).where(eq(rateLimits.rlKey, key));
  return true;
}

async function findActiveUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.status, "active")))
    .limit(1);
  return user ?? null;
}

/**
 * Requests an OTP for `email`. Always resolves (no user-enumeration signal) unless the
 * email is malformed or the legitimate resend cooldown is hit — matches the legacy
 * do_request_code() behavior in server-upload/auth.php.
 */
export async function requestOtp(email: string, ip: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new ValidationError("Enter a valid email address.");

  const ipOk = await checkRateLimit(`otp:ip:${ip}`, 20, 3600);
  if (!ipOk) return;

  const user = await findActiveUserByEmail(normalized);
  if (!user) return;

  const emailOk = await checkRateLimit(`otp:email:${normalized}`, 5, 3600);
  if (!emailOk) return;

  const [existing] = await db.select().from(otpCodes).where(eq(otpCodes.email, normalized)).limit(1);
  if (existing && Date.now() - existing.sentAt.getTime() < OTP_RESEND_SECONDS * 1000) {
    throw new TooManyRequestsError("Please wait a moment before requesting another code.");
  }

  const code = generateCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MIN * 60_000);
  await db
    .insert(otpCodes)
    .values({ email: normalized, codeHash: hashCode(code), attempts: 0, sentAt: now, expiresAt })
    .onDuplicateKeyUpdate({ set: { codeHash: hashCode(code), attempts: 0, sentAt: now, expiresAt } });

  await sendOtpEmail(normalized, code, OTP_TTL_MIN);
}

export type VerifiedUser = { id: string; email: string; role: "admin" | "viewer"; modules: ModuleKey[] };

export async function verifyOtp(email: string, code: string): Promise<VerifiedUser> {
  const normalized = normalizeEmail(email);
  const trimmedCode = code.trim();

  const [rec] = await db.select().from(otpCodes).where(eq(otpCodes.email, normalized)).limit(1);
  if (!rec) throw new ValidationError("No code requested for this email.");

  if (Date.now() > rec.expiresAt.getTime()) {
    await db.delete(otpCodes).where(eq(otpCodes.email, normalized));
    throw new ValidationError("Code expired. Request a new one.");
  }
  if (rec.attempts >= OTP_MAX_ATTEMPTS) {
    await db.delete(otpCodes).where(eq(otpCodes.email, normalized));
    throw new TooManyRequestsError("Too many attempts. Request a new code.");
  }

  const expected = Buffer.from(rec.codeHash, "hex");
  const actual = Buffer.from(hashCode(trimmedCode), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!matches) {
    await db.update(otpCodes).set({ attempts: rec.attempts + 1 }).where(eq(otpCodes.email, normalized));
    throw new ValidationError("Incorrect code. Try again.");
  }

  await db.delete(otpCodes).where(eq(otpCodes.email, normalized));
  const user = await findActiveUserByEmail(normalized);
  if (!user) throw new ValidationError("This email is not authorized.");
  return { id: user.id, email: user.email, role: user.role, modules: parseModules(user.modules) };
}
