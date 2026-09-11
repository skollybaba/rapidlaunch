import { Buffer } from "node:buffer";

import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { slugify } from "@/lib/utils";
import type { ProductCurriculumStored } from "@/types/product";

export const runtime = "nodejs";

function toBytes(value: Buffer | unknown): Uint8Array<ArrayBuffer> | null {
  if (Buffer.isBuffer(value)) return new Uint8Array(value);
  if (value && typeof value === "object") {
    const binary = value as {
      _bsontype?: string;
      value?: () => Buffer;
      buffer?: ArrayBuffer | Uint8Array;
    };
    if (binary._bsontype === "Binary" && typeof binary.value === "function") {
      return new Uint8Array(binary.value());
    }
    if (binary.buffer instanceof Uint8Array) return new Uint8Array(binary.buffer);
    if (binary.buffer instanceof ArrayBuffer) return new Uint8Array(binary.buffer);
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  await dbConnect();
  const doc = await Product.findOne({
    slug: slugify(slug),
    type: "COURSE",
    status: "PUBLISHED",
  })
    .select("title curriculum")
    .lean()
    .exec();

  const curriculum = doc?.curriculum as ProductCurriculumStored | undefined;
  const bytes = toBytes(curriculum?.data);
  if (!bytes || bytes.byteLength === 0) {
    return NextResponse.json(
      { ok: false, error: { code: "CURRICULUM_NOT_FOUND", message: "Curriculum not found" } },
      { status: 404 }
    );
  }

  const safeName = (curriculum?.fileName ?? "curriculum.pdf").replace(/[\r\n"]/g, "_");
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Length": String(bytes.byteLength),
    "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
    "X-Content-Type-Options": "nosniff",
  });

  return new NextResponse(bytes, { status: 200, headers });
}