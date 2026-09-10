import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { slugify } from "@/lib/utils";
import type { ProductCurriculumStored } from "@/types/product";

export const runtime = "nodejs";

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
  if (!curriculum?.data || curriculum.data.byteLength === 0) {
    return NextResponse.json(
      { ok: false, error: { code: "CURRICULUM_NOT_FOUND", message: "Curriculum not found" } },
      { status: 404 }
    );
  }

  const safeName = (curriculum.fileName ?? "curriculum.pdf").replace(/[\r\n"]/g, "_");
  const bytes = Uint8Array.from(curriculum.data);
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Length": String(curriculum.size ?? bytes.byteLength),
    "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
    "X-Content-Type-Options": "nosniff",
  });

  return new NextResponse(bytes, { status: 200, headers });
}