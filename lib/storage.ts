import "server-only";

import { randomBytes } from "node:crypto";
import path from "node:path";

import {
  deleteObject,
  getObject,
  headObject,
  listObjects,
  publicUrl,
  putObject,
} from "@/lib/providers/storage";

export interface StoredFile {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

function safeKey(originalName: string): string {
  const ext = path
    .extname(originalName)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
  const safeExt = ext && ext.length <= 10 ? ext : "";
  return `${randomBytes(16).toString("hex")}${safeExt}`;
}

function cleanKey(key: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(key)) return "";
  if (key.includes("..")) return "";
  return key;
}

export async function writeUpload(
  data: Buffer,
  originalName: string,
  type: string
): Promise<StoredFile> {
  const key = safeKey(originalName);
  await putObject({
    key,
    body: data,
    contentType: type || "application/octet-stream",
  });
  return {
    key,
    name: originalName,
    size: data.byteLength,
    type,
    url: publicUrl(key),
  };
}

export async function readUpload(key: string): Promise<Buffer | null> {
  const clean = cleanKey(key);
  if (!clean) return null;
  const object = await getObject(clean);
  return object?.data ?? null;
}

export async function statUpload(key: string): Promise<{ size: number } | null> {
  const clean = cleanKey(key);
  if (!clean) return null;
  const meta = await headObject(clean);
  return meta ? { size: meta.size } : null;
}

export async function deleteUpload(key: string): Promise<void> {
  const clean = cleanKey(key);
  if (!clean) return;
  await deleteObject(clean);
}

export async function listUploads(): Promise<{ key: string; size: number }[]> {
  return listObjects();
}

export function isImageMime(type: string): boolean {
  return type.startsWith("image/");
}