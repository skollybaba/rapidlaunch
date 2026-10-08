"use client";

import { ArrowRight, ExternalLink } from "lucide-react";

import { YouTubePlayer } from "@/components/learn/youtube-player";
import { buttonStyles } from "@/components/ui/button";
import { parseYouTubeId } from "@/lib/youtube";
import type { BeforeYouStartContent } from "@/types/lms";

/**
 * The "Before you start" sell page a student sees before their first lesson,
 * and its live preview in the admin course form.
 *
 * Rendered with the same design tokens as the player: video on top (through
 * the non-downloadable YouTubePlayer used for lessons), then the admin's rich
 * text, then the CTA row — the always-present "Begin course" button plus the
 * admin's optional link.
 */
export function BeforeYouStartPanel({
  content,
  onBegin,
}: {
  content: BeforeYouStartContent;
  onBegin?: () => void;
}) {
  const videoId = content.youtubeUrl
    ? parseYouTubeId(content.youtubeUrl)
    : null;
  const ctaExternal = /^https?:\/\//i.test(content.ctaUrl ?? "");
  const ctaHref = content.ctaLabel && content.ctaUrl ? content.ctaUrl : null;

  return (
    <article className="rounded-[16px] border border-neutral-300 bg-white p-5 md:p-8">
      {content.title ? (
        <h1 className="text-2xl font-bold text-neutral-950 md:text-3xl">
          {content.title}
        </h1>
      ) : null}

      {videoId ? (
        <div className={content.title ? "mt-6" : ""}>
          <YouTubePlayer
            videoId={videoId}
            title={content.title ?? "Course introduction"}
          />
        </div>
      ) : null}

      {content.contentHtml ? (
        <div
          className="rich-content mt-6 text-base"
          dangerouslySetInnerHTML={{ __html: content.contentHtml }}
        />
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onBegin}
          className={buttonStyles({ variant: "primary", size: "lg" })}
        >
          Begin course
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>

        {ctaHref ? (
          <a
            href={ctaHref}
            target={ctaExternal ? "_blank" : undefined}
            rel={ctaExternal ? "noopener noreferrer" : undefined}
            className={buttonStyles({ variant: "secondary", size: "lg" })}
          >
            {content.ctaLabel}
            {ctaExternal ? (
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            ) : null}
          </a>
        ) : null}
      </div>
    </article>
  );
}