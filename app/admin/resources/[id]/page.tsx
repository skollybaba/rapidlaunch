import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ResourceForm } from "@/components/admin/resource-form";
import { requireAdmin } from "@/lib/auth/admin";
import { getResourceById } from "@/lib/services/resource-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit resource | Rapid Launch Back office",
};

export default async function AdminEditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const resource = await getResourceById(id);
  if (!resource) notFound();

  const initial = {
    id: String(resource._id),
    type: resource.type,
    title: resource.title,
    slug: resource.slug,
    summary: resource.summary ?? "",
    contentHtml: resource.contentHtml ?? "",
    youtubeUrl: resource.youtubeUrl ?? "",
    thumbnailUrl: resource.thumbnailUrl ?? "",
    published: resource.published ?? false,
  };

  const isArticle = resource.type === "ARTICLE";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">
            <Link
              href={isArticle ? "/admin/resources?type=ARTICLE" : "/admin/resources"}
              className="hover:underline"
            >
              Resources
            </Link>{" "}
            / Edit
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-950">
            {resource.title}
          </h1>
        </div>
      </div>
      <ResourceForm
        type={resource.type}
        initial={initial}
        basePath={
          isArticle ? "/admin/resources?type=ARTICLE" : "/admin/resources"
        }
        singularLabel={isArticle ? "guide" : "resource"}
      />
    </div>
  );
}