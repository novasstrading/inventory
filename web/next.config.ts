import type { NextConfig } from "next";

// Empty for local dev / a standalone root deploy. Set to "/admin/inventory" in
// Vercel's production env vars when mounting this app under novasstrading.com
// via Next.js Multi-Zones (see the main site's next.config rewrites, and
// CUTOVER.md) — must match NEXT_PUBLIC_BASE_PATH exactly, and both must match
// wherever this app is actually reached, since the value is inlined at build
// time and can't be changed without a rebuild.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
