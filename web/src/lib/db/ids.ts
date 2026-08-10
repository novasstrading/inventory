import { ulid } from "ulid";

/** Time-sortable, opaque primary key — not an auto-increment int, so ids stay non-enumerable. */
export function newId(): string {
  return ulid();
}
