import type { Metadata } from "next";
import Link from "next/link";

import { ResourceListView } from "@/components/admin/resource-list-view";
import { requireAdmin } from "@/lib/auth/admin";
import type { ResourceType } from "@/types/resource";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources | Rapid Launch Back office",
};

const TABS: { type: ResourceType; label: string }[] = [
  { type: "VIDEO", label: "Video sessions" },
  { type: "ARTICLE", label: "Guides" },
];

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; published?: string; type?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const type: ResourceType = sp.type === "ARTICLE" ? "ARTICLE" : "VIDEO";
  const isArticle = type === "ARTICLE";

  return (
    <div className="admin-enter space-y-6">
      <div
        role="group"
        aria-label="Resource type"
        className="flex rounded-pill border border-neutral-300 bg-white p-1"
      >
        {TABS.map((tab) => {
          const active = tab.type === type;
          return (
            <Link
              key={tab.type}
              href={tab.type === "VIDEO" ? "/admin/resources" : "/admin/resources?type=ARTICLE"}
              aria-current={active ? "page" : undefined}
              className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ${
                active
                  ? "bg-ink-900 text-white"
                  : "text-neutral-500 hover:text-neutral-950"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <ResourceListView
        type={type}
        title={isArticle ? "Guides" : "Resources"}
        description={
          isArticle
            ? "Insights and articles shown on the content hub."
            : "Videos and sessions shown on the content hub."
        }
        basePath="/admin/resources"
        createHref={
          isArticle ? "/admin/resources/new?type=ARTICLE" : "/admin/resources/new"
        }
        createLabel={isArticle ? "New guide" : "New resource"}
        emptyTitle={isArticle ? "No guides yet" : "No resources yet"}
        emptyDescription={
          isArticle
            ? "Add the first guide so visitors have insights to read."
            : "Add the first video so visitors have something to watch."
        }
        q={sp.q ?? ""}
        published={sp.published ?? ""}
      />
    </div>
  );
}