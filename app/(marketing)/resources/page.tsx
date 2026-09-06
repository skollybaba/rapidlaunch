import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  ListVideo,
  PenLine,
} from "lucide-react";
import { Suspense } from "react";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { ResourceGuideCard } from "@/components/catalog/resource-guide-card";
import { ResourceVideoCard } from "@/components/catalog/resource-video-card";
import { Reveal } from "@/components/marketing/reveal";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getPublishedResources } from "@/lib/services/resource-service";

export const metadata: Metadata = {
  title: "Resources | Rapid Launch",
  description:
    "Guides, videos, and practical reading on product strategy, building with AI, and learning to build.",
};

export const dynamic = "force-dynamic";

async function ResourceContent() {
  const resources = await getPublishedResources();
  const guides = resources.filter((r) => r.type === "ARTICLE");
  const videos = resources.filter((r) => r.type === "VIDEO");

  if (guides.length === 0 && videos.length === 0) {
    return (
      <EmptyState
        title="New resources will land here."
        description="We're preparing the first set of guides and sessions. Ask us anything in the meantime."
        action={
          <Link href="/contact" className={buttonStyles({ variant: "primary" })}>
            Ask a question
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {guides.length > 0 ? (
        <section>
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-ink-900">
                <PenLine aria-hidden="true" className="h-5 w-5 text-lavender-200" />
              </span>
              <h2 className="text-[24px] leading-snug md:text-[1.375rem]">Guides</h2>
            </div>
          </Reveal>
          <div className="mt-6 space-y-4">
            {guides.map((guide, index) => (
              <ResourceGuideCard
                key={String(guide._id)}
                title={guide.title}
                slug={guide.slug}
                summary={guide.summary}
                contentHtml={guide.contentHtml}
                index={index}
              />
            ))}
          </div>
        </section>
      ) : null}

      {videos.length > 0 ? (
        <section>
          <Reveal delay={80}>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-ink-900">
                <ListVideo aria-hidden="true" className="h-5 w-5 text-lavender-200" />
              </span>
              <h2 className="text-[24px] leading-snug md:text-[1.375rem]">Watch</h2>
            </div>
          </Reveal>
          <div className="mt-6 space-y-4">
            {videos.map((video, index) => (
              <ResourceVideoCard
                key={String(video._id)}
                title={video.title}
                summary={video.summary}
                thumbnailUrl={video.thumbnailUrl}
                youtubeUrl={video.youtubeUrl ?? "https://www.youtube.com"}
                index={index}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ResourcesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div aria-hidden="true" className="space-y-4">
        <div className="h-10 w-32 animate-pulse rounded-sm bg-neutral-100" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-md border border-neutral-100 bg-white"
          />
        ))}
      </div>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-10 w-32 animate-pulse rounded-sm bg-neutral-100" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-md border border-neutral-100 bg-white"
          />
        ))}
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Resources"
        title="Practical content, no filler."
        description="Short guides and sessions on the workflow that matters: framing the problem, scoping the build, and shipping the first working slice."
      />

      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <Suspense fallback={<ResourcesSkeleton />}>
            <ResourceContent />
          </Suspense>

          <Reveal>
            <div className="mt-16 rounded-md border border-neutral-300 bg-neutral-100 p-8 md:p-12">
              <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div className="max-w-xl">
                  <div className="flex items-center gap-3">
                    <BookOpen aria-hidden="true" className="h-5 w-5 text-terracotta-600" />
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                      Go deeper
                    </p>
                  </div>
                  <h2 className="mt-3 text-[32px] leading-[1.286] md:text-[1.75rem]">
                    Turn the reading into a working method.
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-neutral-500">
                    The fastest way to internalise this workflow is to run it on
                    your own product, with feedback. A course gives you the
                    structure; a session gives you the feedback.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/courses"
                      className={buttonStyles({ variant: "primary", size: "lg" })}
                    >
                      <GraduationCap aria-hidden="true" className="h-4 w-4" />
                      Browse courses
                    </Link>
                    <Link
                      href="/contact"
                      className={buttonStyles({ variant: "secondary", size: "lg" })}
                    >
                      Ask a question
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}