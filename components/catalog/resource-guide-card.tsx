import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";
import { estimateReadMinutes } from "@/lib/utils";

interface ResourceGuideCardProps {
  title: string;
  slug: string;
  summary?: string;
  contentHtml?: string;
  index?: number;
}

export function ResourceGuideCard({
  title,
  slug,
  summary,
  contentHtml,
  index = 0,
}: ResourceGuideCardProps) {
  const readMinutes = estimateReadMinutes(contentHtml);

  return (
    <Reveal delay={index * 60}>
      <article className="group flex h-full flex-col rounded-md border border-neutral-300 bg-white p-6 transition-all duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-md">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          Guide
          {readMinutes ? (
            <>
              <span aria-hidden="true" className="opacity-50">·</span>
              {readMinutes} min read
            </>
          ) : null}
        </p>
        <h3 className="mt-2 text-[1.125rem] leading-snug">
          <Link
            href={`/resources/${slug}`}
            className="transition-colors duration-[var(--duration-fast)] group-hover:text-terracotta-600"
          >
            {title}
          </Link>
        </h3>
        {summary ? (
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            {summary}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
          <Link
            href={`/resources/${slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 transition-colors duration-[var(--duration-fast)] hover:text-terracotta-500"
          >
            Read the guide
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:text-neutral-950"
          >
            Ask a follow-up
          </Link>
        </div>
      </article>
    </Reveal>
  );
}