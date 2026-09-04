import "server-only";

import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

import { env } from "@/lib/env";

const baseDir = () => env.UPLOADS_DIR;

export interface StoredFile {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

function safeKey(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const safeExt = ext && ext.length <= 10 ? ext : "";
  return `${randomBytes(16).toString("hex")}${safeExt}`;
}

export async function writeUpload(data: Buffer, originalName: string, type: string): Promise<StoredFile> {
  const dir = baseDir();
  await mkdir(dir, { recursive: true });
  const key = safeKey(originalName);
  await writeFile(path.join(dir, key), data);
  const size = data.byteLength;
  return {
    key,
    name: originalName,
    size,
    type,
    url: `/api/uploads/${key}`,
  };
}

export async function readUpload(key: string): Promise<Buffer | null> {
  const clean = key.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!clean) return null;
  try {
    return await readFile(path.join(baseDir(), clean));
  } catch {
    return null;
  }
}

export async function statUpload(key: string): Promise<{ size: number } | null> {
  const clean = key.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!clean) return null;
  try {
    const s = await stat(path.join(baseDir(), clean));
    if (!s.isFile()) return null;
    return { size: s.size };
  } catch {
    return null;
  }
}

export async function deleteUpload(key: string): Promise<void> {
  const clean = key.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!clean) return;
  try {
    await rm(path.join(baseDir(), clean), { force: true });
  } catch {
    // best-effort
  }
}

export async function listUploads(): Promise<{ key: string; size: number }[]> {
  try {
    const entries = await readdir(baseDir());
    const out: { key: string; size: number }[] = [];
    for (const name of entries) {
      const s = await stat(path.join(baseDir(), name));
      if (s.isFile()) out.push({ key: name, size: s.size });
    }
    return out;
  } catch {
    return [];
  }
}

export function isImageMime(type: string): boolean {
  return type.startsWith("image/");
}
