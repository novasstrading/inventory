import "server-only";
import { Writable } from "stream";
import { Client } from "basic-ftp";
import { Readable } from "stream";

/**
 * Encrypted-at-rest file storage on cPanel/Exonhost over FTPS (plan §3). Every
 * byte written here has already been through lib/crypto.ts encryptFile() —
 * this module only moves opaque ciphertext, and only ever talks to a folder
 * outside public_html (FTP_BASE_PATH), so nothing here is web-servable even
 * if somebody finds the path. FTP/FTPS chosen over SFTP because shared cPanel
 * hosting almost always exposes FTP; SFTP needs shell access many plans lack.
 */

function remotePath(key: string): string {
  const base = process.env.FTP_BASE_PATH ?? "/nova_secure_files";
  const full = `${base}/${key}`.replace(/\/+/g, "/");
  if (full.includes("..")) throw new Error("Invalid storage key.");
  return full;
}

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const host = process.env.FTP_HOST;
  const user = process.env.FTP_USER;
  const password = process.env.FTP_PASSWORD;
  if (!host || !user || !password) throw new Error("FTP_HOST/FTP_USER/FTP_PASSWORD are not configured.");

  const client = new Client(20_000);
  try {
    await client.access({
      host,
      port: Number(process.env.FTP_PORT ?? 21),
      user,
      password,
      secure: process.env.FTP_SECURE !== "false",
    });
    return await fn(client);
  } finally {
    client.close();
  }
}

function splitPath(full: string): { dir: string; file: string } {
  const parts = full.split("/");
  const file = parts.pop()!;
  return { dir: parts.join("/") || "/", file };
}

/** Uploads already-encrypted bytes to `key`, creating parent folders as needed. */
export async function uploadEncryptedFile(key: string, data: Buffer): Promise<void> {
  const { dir, file } = splitPath(remotePath(key));
  await withClient(async (client) => {
    await client.ensureDir(dir);
    await client.uploadFrom(Readable.from(data), file);
  });
}

/** Downloads the raw (still-encrypted) bytes stored at `key`. */
export async function downloadEncryptedFile(key: string): Promise<Buffer> {
  const { dir, file } = splitPath(remotePath(key));
  return withClient(async (client) => {
    await client.cd(dir);
    const chunks: Buffer[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    await client.downloadTo(sink, file);
    return Buffer.concat(chunks);
  });
}

/** Deletes the file at `key`. No-op (doesn't throw) if it's already gone. */
export async function deleteEncryptedFile(key: string): Promise<void> {
  const { dir, file } = splitPath(remotePath(key));
  await withClient(async (client) => {
    await client.cd(dir);
    await client.remove(file).catch(() => undefined);
  });
}
