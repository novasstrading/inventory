import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Application-level AES-256-GCM encryption for data that stays on cPanel
 * (both DB columns and file bytes shipped over FTP/SFTP) — see plan §3/§4.
 * Packed format: [1-byte key version][12-byte IV][ciphertext][16-byte auth tag]
 * The version byte lets us rotate FIELD_ENCRYPTION_KEY / FILE_ENCRYPTION_KEY
 * later without a flag day: add a new entry to KEY_VERSIONS, bump CURRENT_KEY_VERSION,
 * keep old versions around so already-encrypted rows/files still decrypt.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const CURRENT_KEY_VERSION = 1;

function loadKey(envVar: string): Buffer {
  const raw = process.env[envVar];
  if (!raw) {
    throw new Error(`${envVar} is not set — required to encrypt/decrypt sensitive data.`);
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`${envVar} must decode to exactly 32 bytes (openssl rand -base64 32).`);
  }
  return key;
}

function keyVersions(envVar: string): Record<number, Buffer> {
  return { [CURRENT_KEY_VERSION]: loadKey(envVar) };
}

function encryptWith(envVar: string, plaintext: Buffer): Buffer {
  const keys = keyVersions(envVar);
  const key = keys[CURRENT_KEY_VERSION];
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([CURRENT_KEY_VERSION]), iv, ciphertext, tag]);
}

function decryptWith(envVar: string, packed: Buffer): Buffer {
  const version = packed.readUInt8(0);
  const keys = keyVersions(envVar);
  const key = keys[version];
  if (!key) throw new Error(`No ${envVar} available for key version ${version}.`);
  const iv = packed.subarray(1, 1 + IV_LENGTH);
  const tag = packed.subarray(packed.length - TAG_LENGTH);
  const ciphertext = packed.subarray(1 + IV_LENGTH, packed.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Encrypt a UTF-8 string field (employees.contact, assets.notes, ...) for storage,
 * returned as base64 text — this drizzle-orm version's mysql varbinary() column is
 * string-typed with no Buffer mode, and round-tripping raw binary through a JS
 * string (implicit UTF-8) would corrupt it. Base64 keeps it a plain varchar column.
 */
export function encryptField(plaintext: string): string {
  return encryptWith("FIELD_ENCRYPTION_KEY", Buffer.from(plaintext, "utf8")).toString("base64");
}

/** Decrypt a field previously produced by encryptField(). Returns "" for null/empty input. */
export function decryptField(packed: string | null | undefined): string {
  if (!packed) return "";
  return decryptWith("FIELD_ENCRYPTION_KEY", Buffer.from(packed, "base64")).toString("utf8");
}

/** Encrypt raw file bytes (photo/document/sticker) before they leave the app for cPanel. */
export function encryptFile(plaintext: Buffer): Buffer {
  return encryptWith("FILE_ENCRYPTION_KEY", plaintext);
}

/** Decrypt file bytes pulled back from cPanel via FTP/SFTP. */
export function decryptFile(packed: Buffer): Buffer {
  return decryptWith("FILE_ENCRYPTION_KEY", packed);
}
