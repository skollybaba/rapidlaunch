import { ArrowUpRight, Play } from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";

interface ResourceVideoCardProps {
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  youtubeUrl: string;
  index?: number;
}

export function ResourceVideoCard({
  title,
  summary,
  thumbnailUrl,
  youtubeUrl,
  index = 0,
}: ResourceVideoCardProps) {
  return (
    <Reveal delay={index * 60}>
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block overflow-hidden rounded-md border border-neutral-300 bg-white transition-all duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-md"
      >
        <div className="relative">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={title}
              loading="lazy"
              className="h-44 w-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-44 w-full items-center justify-center bg-neutral-100">
              <Play aria-hidden="true" className="h-8 w-8 text-neutral-300" />
            </div>
          )}
          <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-900 shadow-lg ring-1 ring-neutral-300">
            <Play aria-hidden="true" className="ml-0.5 h-5 w-5" />
          </span>
          <span className="absolute right-4 top-4 rounded-full bg-ink-950/70 px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            Session
          </span>
        </div>
        <div className="p-6">
          <h3 className="text-[1.125rem] leading-snug">{title}</h3>
          {summary ? (
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              {summary}
            </p>
          ) : null}
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 transition-colors duration-[var(--duration-fast)] group-hover:text-terracotta-500">
            Watch on YouTube
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-[var(--duration-fast)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </a>
    </Reveal>
  );
}