import { useId } from "react";
import { BookOpen, GraduationCap, MessageSquareQuote, Rocket } from "lucide-react";

import type { ProductType } from "@/types/product";
import { cn } from "@/lib/utils";

/* Branded placeholder artwork generated in code (DESIGN.md §8).
   Ink core, lavender tints, violet brand accent. */

export type ProductCoverFormat = "landscape" | "portrait" | "square";

const FORMAT_ASPECT: Record<ProductCoverFormat, string> = {
  landscape: "aspect-video",
  portrait: "aspect-[2/3]",
  square: "aspect-square",
};

const TYPE_ICON: Record<ProductType, typeof BookOpen> = {
  COURSE: GraduationCap,
  BOOK: BookOpen,
  CONSULTATION: MessageSquareQuote,
  MVP_SERVICE: Rocket,
};

const TYPE_KICKER: Record<ProductType, string> = {
  COURSE: "Course · Classroom",
  BOOK: "Book · Practical reading",
  CONSULTATION: "Consultation · 1-on-1",
  MVP_SERVICE: "MVP build · Outcome-led",
};

interface ProductCoverProps {
  type: ProductType;
  title: string;
  subtitle?: string;
  format?: ProductCoverFormat;
  className?: string;
}

export function ProductCover({
  type,
  title,
  subtitle,
  format = "landscape",
  className,
}: ProductCoverProps) {
  const Icon = TYPE_ICON[type];
  const titleLines = title.split(" ");
  const patternId = `ql-grid-${useId().replace(/:/g, "")}`;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden bg-ink-950",
        FORMAT_ASPECT[format],
        className
      )}
    >
      {/* Purposeful navy → indigo vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_18%_12%,var(--color-ink-700)_0%,var(--color-ink-900)_46%,var(--color-ink-950)_100%)]" />

      {/* Quiet grid texture */}
      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 96 72"
      >
        <defs>
          <pattern
            id={patternId}
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 12 0 L 0 0 0 12"
              fill="none"
              stroke="var(--color-ink-700)"
              strokeOpacity="0.45"
            />
          </pattern>
        </defs>
        <rect width="96" height="72" fill={`url(#${patternId})`} />
      </svg>

      {/* Large watermark glyph */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white/[0.07] ring-1 ring-inset ring-white/15">
          <Icon
            aria-hidden="true"
            className="h-14 w-14 text-lavender-200/90"
          />
        </span>
      </div>

      {/* Drifting brand glow */}
      <div className="animate-drift absolute -right-10 -top-12 h-64 w-64 rounded-full bg-ink-700/20 blur-3xl" />

      {/* Monogram block */}
      <div className="absolute inset-0 flex flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-white/10 ring-1 ring-white/15">
            <Icon className="h-5 w-5 text-lavender-200" />
          </span>
          {subtitle ? (
            <span className="max-w-[55%] text-right text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-lavender-200/90">
              {subtitle}
            </span>
          ) : null}
        </div>

        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-terracotta-100">
            {TYPE_KICKER[type]}
          </p>
          <h3 className="mt-2 font-sans text-base font-bold leading-snug text-white md:text-lg">
            {title}
          </h3>
          <div className="mt-3 flex gap-1.5">
            {(titleLines[1] ? titleLines : titleLines.slice(0, 1)).map(
              (word, index) => (
                <span
                  key={`${word}-${index}`}
                  className="inline-block h-1.5 w-8 rounded-full bg-white/20"
                />
              )
            )}
            <span className="inline-block h-1.5 w-12 rounded-full bg-terracotta-500/70" />
          </div>
        </div>
      </div>
    </div>
  );
}