import "server-only";
import { sql } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { CODE_PAD, CODE_PREFIX } from "./categories-seed";

/**
 * Atomically reserves the next sequential number for a category's code tag and
 * returns the formatted code, e.g. NOVA-LT-0007 — replaces codes.json's
 * counters/assigned maps. Must be called inside the same db.transaction() as
 * the asset insert (lib/assets/service.ts) so a failed insert also rolls back
 * the reservation, and concurrent creates never hand out the same number.
 *
 * Uses MySQL's INSERT ... ON DUPLICATE KEY UPDATE + LAST_INSERT_ID(expr) trick:
 * the UPDATE takes a row lock (serializing concurrent callers for this tag),
 * and LAST_INSERT_ID() is connection-local, so pinning to one tx connection
 * is what makes the read-back race-free.
 */
export async function nextCode(tx: Tx, tag: string): Promise<string> {
  await tx.execute(sql`
    insert into code_counters (tag, counter) values (${tag}, 1)
    on duplicate key update counter = last_insert_id(counter + 1)
  `);
  const [rows] = await tx.execute<{ n: number }>(sql`select last_insert_id() as n`);
  const n = Number((rows as unknown as Array<{ n: number }>)[0]?.n ?? 0);
  return `${CODE_PREFIX}-${tag}-${String(n).padStart(CODE_PAD, "0")}`;
}
