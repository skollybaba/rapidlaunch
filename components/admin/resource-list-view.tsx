import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminResources } from "@/lib/services/resource-service";
import { formatDate } from "@/lib/utils";
import type { ResourceType } from "@/types/resource";

interface ResourceListViewProps {
  type: ResourceType;
  title: string;
  description: string;
  basePath: string;
  createHref: string;
  createLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  q?: string;
  published?: string;
}

export async function ResourceListView({
  type,
  title,
  description,
  basePath,
  createHref,
  createLabel,
  emptyTitle,
  emptyDescription,
  q = "",
  published = "",
}: ResourceListViewProps) {
  const rows = await getAdminResources({
    type,
    q,
    published: published === "true" ? true : published === "false" ? false : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        </div>
        <Link
          href={createHref}
          className="rounded-pill bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terracotta-500"
        >
          {createLabel}
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by title, slug, or summary"
            className="w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
        <div>
          <select
            name="published"
            defaultValue={published}
            className="h-[42px] rounded-[12px] border border-neutral-300 bg-white px-3 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </div>
        <button
          type="submit"
          className="h-[42px] rounded-pill bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Link
              href={createHref}
              className="rounded-pill bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              {createLabel}
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Slug</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`${basePath}/${row.id}`}
                        className="font-medium text-terracotta-600 hover:underline"
                      >
                        {row.title}
                      </Link>
                      {row.summary ? (
                        <p className="mt-1 max-w-md truncate text-xs text-neutral-500">
                          {row.summary}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-neutral-700">{row.slug}</td>
                    <td className="px-5 py-4">
                      <Badge tone={row.published ? "success" : "pending"}>
                        {row.published ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {formatDate(row.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}