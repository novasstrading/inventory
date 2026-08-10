import "server-only";
import { randomBytes } from "crypto";

export function extOf(filename: string): string {
  return (filename.split(".").pop() || "").toLowerCase();
}

export function randomFilename(ext: string): string {
  return `${Date.now().toString(36)}_${randomBytes(4).toString("hex")}.${ext}`;
}

/** A storage key is safe to path-join once every segment is one of these — no traversal, no surprises. */
export function safeSlug(input: string): string {
  return input.replace(/[^A-Za-z0-9_-]/g, "_") || "x";
}
