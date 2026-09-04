import type { Metadata } from "next";
import Link from "next/link";

import { ResourceForm } from "@/components/admin/resource-form";
import { requireAdmin } from "@/lib/auth/admin";
import type { ResourceType } from "@/types/resource";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New resource | Rapid Launch Back office",
};

export default async function AdminNewResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const type: ResourceType = sp.type === "ARTICLE" ? "ARTICLE" : "VIDEO";
  const isArticle = type === "ARTICLE";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">
            <Link href="/admin/resources" className="hover:underline">
              Resources
            </Link>{" "}
            / New
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-950">
            {isArticle ? "New guide" : "New resource"}
          </h1>
        </div>
      </div>
      <ResourceForm
        type={type}
        basePath={
          isArticle ? "/admin/resources?type=ARTICLE" : "/admin/resources"
        }
        singularLabel={isArticle ? "guide" : "resource"}
      />
    </div>
  );
}