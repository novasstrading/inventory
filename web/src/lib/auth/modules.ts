/**
 * Per-user module access for the unified /admin door. This app is the identity
 * store for both apps mounted under /admin: "assets" is this Asset Manager,
 * "website" is the separate website-editor app. Stored on users.modules as a
 * comma-separated list (e.g. "website,assets"). Safe to import from client code.
 */

export const MODULES = ["website", "assets"] as const;
export type ModuleKey = (typeof MODULES)[number];

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULES as readonly string[]).includes(value);
}

/** Parses the stored CSV: trims, drops unknown values, dedupes, and returns them in MODULES order. */
export function parseModules(csv: string | null | undefined): ModuleKey[] {
  if (!csv) return [];
  const found = new Set(csv.split(",").map((s) => s.trim()));
  return MODULES.filter((m) => found.has(m));
}

/** Serialises a module list for storage (normalised the same way parseModules reads it). */
export function formatModules(list: readonly string[]): string {
  return parseModules(list.join(",")).join(",");
}

export function hasModule(list: readonly ModuleKey[], m: ModuleKey): boolean {
  return list.includes(m);
}

export function defaultModulesForRole(role: "admin" | "viewer"): ModuleKey[] {
  return role === "admin" ? ["website", "assets"] : ["assets"];
}
