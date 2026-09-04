import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true, data: { ok: true } }, { status: 200 });
  response.cookies.delete(SESSION_COOKIE);

  return response;
}
