import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { assets, locations } from "@/lib/db/schema";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/auth/errors";

export type LocationDTO = { id: string; name: string };

function toDTO(row: typeof locations.$inferSelect): LocationDTO {
  return { id: row.id, name: row.name };
}

export async function listLocations(): Promise<LocationDTO[]> {
  const rows = await db.select().from(locations).orderBy(asc(locations.name));
  return rows.map(toDTO);
}

export async function createLocation(name: string): Promise<LocationDTO> {
  const trimmed = name.trim();
  const existing = await db.query.locations.findFirst({ where: eq(locations.name, trimmed) });
  if (existing) throw new ConflictError(`"${trimmed}" is already in the location list.`);

  const id = newId();
  const now = new Date();
  await db.insert(locations).values({ id, name: trimmed, createdAt: now, updatedAt: now });
  return { id, name: trimmed };
}

/** Deletes a location — refuses if any asset's free-text location still matches its name exactly. */
export async function deleteLocationOrThrow(id: string): Promise<void> {
  const existing = await db.query.locations.findFirst({ where: eq(locations.id, id) });
  if (!existing) throw new NotFoundError("Location not found.");

  const inUse = await db.select().from(assets).where(eq(assets.location, existing.name));
  if (inUse.length > 0) {
    throw new ValidationError(
      `"${existing.name}" is still used by ${inUse.length} asset${inUse.length === 1 ? "" : "s"} — reassign ${inUse.length === 1 ? "it" : "them"} to another location first.`,
    );
  }

  await db.delete(locations).where(eq(locations.id, id));
}
