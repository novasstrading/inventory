/**
 * Next's `basePath` config auto-prefixes next/link, next/navigation, and next/image —
 * but NOT raw fetch()/img-src/href strings, which this whole app uses for its own
 * API calls and file downloads. NEXT_PUBLIC_BASE_PATH must be set to the exact same
 * value as `basePath` in next.config.ts (empty string for root deploys, e.g.
 * "/admin/inventory" when mounted under the main site via Next.js Multi-Zones).
 * Safe to import from both client and server code.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes an absolute app-relative path (must start with "/") with the configured basePath. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
