import { apiOk } from "@/lib/api";
import { logoutUser } from "@/lib/services/auth-service";

export const runtime = "nodejs";

export async function POST() {
  await logoutUser();
  return apiOk({ ok: true });
}
