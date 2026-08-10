/**
 * Seed data ported 1:1 from the legacy config.php $CATEGORY_CODES / $SOFTWARE_CATEGORIES.
 * Categories are admin-editable in the DB going forward; this is only the initial seed
 * (see scripts/seed-categories.ts) so a fresh environment starts with the same taxonomy
 * staff already know.
 */
export const CATEGORY_SEED: Array<{
  name: string;
  kind: "hardware" | "software";
  codeTag: string | null;
  sortOrder: number;
}> = [
  { name: "Laptop", kind: "hardware", codeTag: "LT", sortOrder: 10 },
  { name: "Desktop", kind: "hardware", codeTag: "DT", sortOrder: 20 },
  { name: "CC Camera", kind: "hardware", codeTag: "CC", sortOrder: 30 },
  { name: "Router", kind: "hardware", codeTag: "RT", sortOrder: 40 },
  { name: "Switch", kind: "hardware", codeTag: "SW", sortOrder: 50 },
  { name: "Pendrive", kind: "hardware", codeTag: "PD", sortOrder: 60 },
  { name: "Hard Drive", kind: "hardware", codeTag: "HD", sortOrder: 70 },
  { name: "SSD", kind: "hardware", codeTag: "SD", sortOrder: 80 },
  { name: "Dongle", kind: "hardware", codeTag: "DG", sortOrder: 90 },
  { name: "Monitor", kind: "hardware", codeTag: "MN", sortOrder: 100 },
  { name: "Printer", kind: "hardware", codeTag: "PR", sortOrder: 110 },
  { name: "UPS", kind: "hardware", codeTag: "UP", sortOrder: 120 },
  { name: "Phone", kind: "hardware", codeTag: "PH", sortOrder: 130 },
  { name: "Networking", kind: "hardware", codeTag: "NW", sortOrder: 140 },
  { name: "Other", kind: "hardware", codeTag: "OT", sortOrder: 150 },
  { name: "Domain", kind: "software", codeTag: null, sortOrder: 160 },
  { name: "Hosting", kind: "software", codeTag: null, sortOrder: 170 },
  { name: "Email Service", kind: "software", codeTag: null, sortOrder: 180 },
  { name: "Subscription", kind: "software", codeTag: null, sortOrder: 190 },
  { name: "License", kind: "software", codeTag: null, sortOrder: 200 },
  { name: "Other Software", kind: "software", codeTag: null, sortOrder: 210 },
];

export const CODE_PREFIX = "NOVA";
export const CODE_PAD = 4;
