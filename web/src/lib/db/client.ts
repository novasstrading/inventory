import "server-only";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

/**
 * Pooled MySQL connection to cPanel/Exonhost, cached on globalThis so warm
 * Vercel function instances reuse it instead of opening a new connection
 * per request (plan §2). Kept small — this is a low-traffic internal tool.
 */

declare global {
  // eslint-disable-next-line no-var
  var __novaMysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const sslMode = process.env.DATABASE_SSL ?? "true";
  return mysql.createPool({
    uri: url,
    connectionLimit: 3,
    maxIdle: 1,
    idleTimeout: 10_000,
    connectTimeout: 5_000,
    ssl: sslMode === "false" ? undefined : { rejectUnauthorized: sslMode === "strict" },
  });
}

const pool = globalThis.__novaMysqlPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__novaMysqlPool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
