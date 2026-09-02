import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const DEFAULT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;

function toBuffer(value: string | Buffer): Buffer {
  return typeof value === "string" ? Buffer.from(value, "hex") : value;
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      DEFAULT_OPTIONS as never,
      (error, derived) => {
        if (error) reject(error);
        else resolve(derived);
      }
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await derive(password, salt);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const salt = toBuffer(parts[1]);
  const expected = toBuffer(parts[2]);
  const actual = await derive(password, salt);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
