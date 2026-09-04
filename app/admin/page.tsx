import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  await requireAdmin();
  redirect("/admin/dashboard");
}
