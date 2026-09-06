import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ListVideo, PenLine } from "lucide-react";

import { ResourceGuideCard } from "@/components/catalog/resource-guide-card";
import { ResourceVideoCard } from "@/components/catalog/resource-video-card";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  getPublishedResourceBySlug,
  getPublishedResources,
} from "@/lib/services/resource-service";
import { estimateReadMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ResourceDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function resolveResource(slug: string) {
  const resource = await getPublishedResourceBySlug(slug);
  if (!resource) notFound();
  return resource;
}

export async function generateMetadata({
  params,
}: ResourceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = await resolveResource(slug);
  return {
    title: `${resource.title} | Rapid Launch`,
    description: resource.summary ?? undefined,
    openGraph: {
      title: resource.title,
      description: resource.summary ?? undefined,
      type: "article",
      images: resource.thumbnailUrl ? [resource.thumbnailUrl] : undefined,
    },
  };
}

export default async function ResourceDetailPage({
  params,
}: ResourceDetailPageProps) {
  const { slug } = await params;
  const resource = await resolveResource(slug);
  const allResources = await getPublishedResources();
  const related = allResources
    .filter((r) => String(r._id) !== String(resource._id))
    .slice(0, 3);

  const isVideo = resource.type === "VIDEO";
  const readMinutes = estimateReadMinutes(resource.contentHtml);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-10 lg:px-8 lg:py-16">
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:text-neutral-950"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          All resources
        </Link>

        <article className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="info">
                {isVideo ? "Video session" : "Guide"}
              </Badge>
              {!isVideo && readMinutes ? (
                <span className="text-xs font-medium text-neutral-500">
                  {readMinutes} min read
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-[38px] leading-[1.2] lg:text-[2.5rem] lg:leading-[1.2]">
              {resource.title}
            </h1>
            {resource.summary ? (
              <p className="mt-4 max-w-2xl text-[1.125rem] leading-relaxed text-neutral-500">
                {resource.summary}
              </p>
            ) : null}

            {isVideo ? (
              <>
                <div className="mt-8">
                  {resource.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resource.thumbnailUrl}
                      alt={resource.title}
                      className="aspect-video w-full rounded-md border border-neutral-300 bg-neutral-100 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-md border border-neutral-300 bg-neutral-100">
                      <ListVideo aria-hidden="true" className="h-10 w-10 text-neutral-300" />
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <a
                    href={resource.youtubeUrl ?? "https://www.youtube.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({ variant: "primary", size: "lg" })}
                  >
                    Watch on YouTube
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
              </>
            ) : null}

            {resource.contentHtml ? (
              <div className="mt-10">
                {isVideo ? (
                  <h2 className="text-[24px] leading-snug md:text-[1.375rem]">
                    Session notes
                  </h2>
                ) : null}
                <div
                  className={isVideo ? "mt-4" : ""}
                  dangerouslySetInnerHTML={{ __html: resource.contentHtml }}
                />
              </div>
            ) : null}

            <div className="mt-12 rounded-md border border-neutral-300 bg-neutral-100 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-ink-900">
                  <PenLine aria-hidden="true" className="h-4 w-4 text-lavender-200" />
                </span>
                <h2 className="text-[24px] leading-snug md:text-[1.25rem]">
                  Want to apply this to your product?
                </h2>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-500">
                Bring what you read to a working session. We will pressure-test
                your roadmap, scope the build, and help you ship the first
                working slice.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className={buttonStyles({ variant: "primary" })}
                >
                  Book a session
                </Link>
                <Link
                  href="/courses"
                  className={buttonStyles({ variant: "secondary" })}
                >
                  Browse courses
                </Link>
              </div>
            </div>
          </div>
        </article>

        {related.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-[24px] leading-snug md:text-[1.375rem]">
              Keep exploring
            </h2>
            <div className="mt-6 space-y-4">
              {related.map((item, index) =>
                item.type === "VIDEO" ? (
                  <ResourceVideoCard
                    key={String(item._id)}
                    title={item.title}
                    summary={item.summary}
                    thumbnailUrl={item.thumbnailUrl}
                    youtubeUrl={item.youtubeUrl ?? "https://www.youtube.com"}
                    index={index * 2}
                  />
                ) : (
                  <ResourceGuideCard
                    key={String(item._id)}
                    title={item.title}
                    slug={item.slug}
                    summary={item.summary}
                    contentHtml={item.contentHtml}
                    index={index * 2}
                  />
                )
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}