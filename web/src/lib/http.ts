import { NextResponse } from "next/server";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/auth/errors";
import { ZodError } from "zod";

/** Mirrors the legacy PHP api.php ok()/fail() envelope shape: {ok, ...}. */
export function ok<T extends object>(data: T = {} as T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

function statusFor(err: unknown): number {
  if (err instanceof UnauthorizedError) return 401;
  if (err instanceof ForbiddenError) return 403;
  if (err instanceof NotFoundError) return 404;
  if (err instanceof ConflictError) return 409;
  if (err instanceof TooManyRequestsError) return 429;
  if (err instanceof ValidationError || err instanceof ZodError) return 400;
  return 500;
}

function messageFor(err: unknown, status: number): string {
  // Only our own typed, intentionally-user-facing errors (< 500) get their message
  // shown to the client. A 500 can be a raw driver/DB error — e.g. mysql2 attaches
  // the full failed SQL query text to Error#message — so never echo that back.
  if (status < 500) {
    if (err instanceof ZodError) return err.issues[0]?.message ?? "Invalid request.";
    if (err instanceof Error) return err.message;
  }
  return "Something went wrong. Please try again shortly.";
}

/** Converts a thrown error into the same {ok:false, error} envelope the legacy API used. */
export function fail(err: unknown) {
  const status = statusFor(err);
  if (status === 500) console.error(err);
  return NextResponse.json({ ok: false, error: messageFor(err, status) }, { status });
}

/** Wraps a route handler body so any thrown error becomes a proper JSON error response. */
export function withApiErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      return fail(err);
    }
  };
}
