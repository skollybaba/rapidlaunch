import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { env } from "@/lib/env";

export interface StoredObjectMeta {
  key: string;
  size: number;
}

const FOLDER = "quicklaunch";

function requireConfig() {
  const missing = [
    !env.CLOUDINARY_CLOUD_NAME && "CLOUDINARY_CLOUD_NAME",
    !env.CLOUDINARY_API_KEY && "CLOUDINARY_API_KEY",
    !env.CLOUDINARY_API_SECRET && "CLOUDINARY_API_SECRET",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    throw new Error(
      `Cloudinary is not configured. Missing: ${missing.join(", ")}. ` +
        "Add the CLOUDINARY_* values to .env.local (see README · Storage section)."
    );
  }
}

function configure() {
  requireConfig();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function publicId(key: string): string {
  return `${FOLDER}/${key}`;
}

function resourceType(key: string): "image" | "raw" {
  return /\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?|ico)$/i.test(key)
    ? "image"
    : "raw";
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { http_code?: number }).http_code === 404
  );
}

type UploadOptions = Record<string, unknown>;

function uploadBuffer(body: Buffer, options: UploadOptions): Promise<void> {
  // Runtime signature is (callback, options) — the published types are reversed.
  const uploadStream = cloudinary.uploader.upload_stream as (
    callback: (error: unknown) => void,
    options: UploadOptions
  ) => { end: (chunk: Buffer) => void };

  return new Promise((resolve, reject) => {
    const stream = uploadStream(
      (error) => {
        if (error) reject(error);
        else resolve();
      },
      options
    );
    stream.end(body);
  });
}

export async function putObject(input: {
  key: string;
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<void> {
  configure();
  const isImage = !input.contentType || input.contentType.startsWith("image/");
  await uploadBuffer(input.body, {
    folder: FOLDER,
    public_id: input.key,
    resource_type: isImage ? "image" : "raw",
    overwrite: true,
  });
}

export async function getObject(
  key: string
): Promise<{ data: Buffer; size: number } | null> {
  configure();
  const response = await fetch(publicUrl(key));
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Cloudinary download failed with status ${response.status}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  return { data, size: data.length };
}

export async function deleteObject(key: string): Promise<void> {
  configure();
  try {
    await cloudinary.api.delete_resources([publicId(key)], {
      resource_type: resourceType(key),
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

export async function headObject(key: string): Promise<StoredObjectMeta | null> {
  configure();
  try {
    const asset = await cloudinary.api.resource(publicId(key), {
      resource_type: resourceType(key),
    });
    return { key, size: asset.bytes ?? 0 };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function listObjects(): Promise<StoredObjectMeta[]> {
  configure();
  const [images, files] = await Promise.all([
    cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      prefix: `${FOLDER}/`,
      max_results: 500,
    }),
    cloudinary.api.resources({
      type: "upload",
      resource_type: "raw",
      prefix: `${FOLDER}/`,
      max_results: 500,
    }),
  ]);

  const rows: StoredObjectMeta[] = [];
  for (const assembly of [images, files]) {
    for (const resource of assembly.resources ?? []) {
      rows.push({
        key: (resource.public_id as string).replace(`${FOLDER}/`, ""),
        size: resource.bytes ?? 0,
      });
    }
  }
  return rows;
}

export function publicUrl(key: string): string {
  configure();
  const type = resourceType(key);
  return cloudinary.url(publicId(key), {
    secure: true,
    resource_type: type,
    type: "upload",
  });
}