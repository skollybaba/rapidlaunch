import "server-only";

import crypto from "crypto";

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

function extensionOf(key: string): string {
  const dot = key.lastIndexOf(".");
  return dot > 0 ? key.slice(dot + 1).toLowerCase() : "";
}

function stripExtension(key: string): string {
  const ext = extensionOf(key);
  return ext ? key.slice(0, -(ext.length + 1)) : key;
}

function publicId(key: string): string {
  return `${FOLDER}/${stripExtension(key)}`;
}

function formatOf(key: string): string {
  return extensionOf(key);
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

type UploadOptions = {
  folder?: string;
  public_id?: string;
  resource_type?: "image" | "raw";
  overwrite?: boolean;
  content_type?: string;
};

function sha1(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function signedUploadUrl(resourceType: "image" | "raw"): string {
  return `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
}

async function uploadBytes(body: Buffer, options: UploadOptions) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyParams: Record<string, string> = {
    folder: FOLDER,
    overwrite: "true",
    timestamp,
  };
  if (options.public_id) bodyParams.public_id = String(options.public_id);

  const signatureSource = Object.keys(bodyParams)
    .sort()
    .map((key) => `${key}=${bodyParams[key]}`)
    .join("&");
  const signature = sha1(`${signatureSource}${env.CLOUDINARY_API_SECRET}`);

  const mime = options.content_type ?? "application/octet-stream";
  const fileData = `data:${mime};base64,${body.toString("base64")}`;

  const form = new URLSearchParams({
    file: fileData,
    ...bodyParams,
    api_key: env.CLOUDINARY_API_KEY!,
    signature,
  });

  const response = await fetch(signedUploadUrl(options.resource_type ?? "raw"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const result = (await response.json().catch(() => null)) as {
    public_id?: string;
    secure_url?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok || !result || result.error) {
    const message = result?.error?.message ?? `Cloudinary upload failed (${response.status})`;
    throw new Error(message);
  }
  if (!result.secure_url) {
    throw new Error("Cloudinary upload returned no URL.");
  }
}

export async function putObject(input: {
  key: string;
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<void> {
  const isImage = !input.contentType || input.contentType.startsWith("image/");
  await uploadBytes(input.body, {
    folder: FOLDER,
    public_id: stripExtension(input.key),
    resource_type: isImage ? "image" : "raw",
    overwrite: true,
    content_type: isImage ? input.contentType : undefined,
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
      const base = (resource.public_id as string).replace(`${FOLDER}/`, "");
      const key = resource.format ? `${base}.${resource.format}` : base;
      rows.push({
        key,
        size: resource.bytes ?? 0,
      });
    }
  }
  return rows;
}

export function publicUrl(key: string): string {
  configure();
  const type = resourceType(key);
  const format = formatOf(key);
  return cloudinary.url(publicId(key), {
    secure: true,
    resource_type: type,
    type: "upload",
    ...(format ? { format } : {}),
  });
}