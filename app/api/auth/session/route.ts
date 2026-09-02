import { apiOk } from "@/lib/api";
import { getCurrentPublicUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentPublicUser();
  return apiOk({ user });
}
