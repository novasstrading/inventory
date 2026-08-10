import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
  process.env.FILE_ENCRYPTION_KEY = Buffer.alloc(32, 2).toString("base64");
});

describe("field/file encryption round-trip", () => {
  it("encrypts and decrypts a string field", async () => {
    const { encryptField, decryptField } = await import("../crypto");
    const packed = encryptField("+880 1XXXXXXXXX");
    expect(packed).toBeInstanceOf(Buffer);
    expect(decryptField(packed)).toBe("+880 1XXXXXXXXX");
  });

  it("returns empty string for null/empty input", async () => {
    const { decryptField } = await import("../crypto");
    expect(decryptField(null)).toBe("");
    expect(decryptField(Buffer.alloc(0))).toBe("");
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", async () => {
    const { encryptField } = await import("../crypto");
    const a = encryptField("same-value");
    const b = encryptField("same-value");
    expect(a.equals(b)).toBe(false);
  });

  it("encrypts and decrypts raw file bytes", async () => {
    const { encryptFile, decryptFile } = await import("../crypto");
    const original = Buffer.from([0, 1, 2, 255, 254, 253, 10, 20, 30]);
    const packed = encryptFile(original);
    expect(decryptFile(packed).equals(original)).toBe(true);
  });

  it("fails to decrypt with a tampered auth tag", async () => {
    const { encryptField, decryptField } = await import("../crypto");
    const packed = encryptField("tamper me");
    packed[packed.length - 1] ^= 0xff;
    expect(() => decryptField(packed)).toThrow();
  });
});
