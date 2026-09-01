import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  ListVideo,
  PenLine,
  Play,
} from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { Reveal } from "@/components/marketing/reveal";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Resources | Rapid Launch",
  description:
    "Guides, videos, and practical reading on product strategy, building with AI, and learning to build.",
};

const GUIDES = [
  {
    title: "The idea audit: six questions before you build",
    minutes: 8,
    body: "A repeatable checklist that pressure-tests a product idea before it costs engineering time.",
  },
  {
    title: "Writing requirements that AI can execute",
    minutes: 11,
    body: "How to turn vague asks into scoped, testable work that models and engineers can both act on.",
  },
  {
    title: "Roadmap review: reading a plan for risk",
    minutes: 6,
    body: "The signals that reveal a roadmap built on assumptions rather than evidence.",
  },
];

const WATCH = [
  {
    title: "From idea to roadmap in one session",
    duration: "22 min",
    body: "A live strategy walkthrough with a real product problem (anonymised).",
    image: "/images/collab-meeting.jpg",
    alt: "Team discussing a product roadmap in a meeting",
    youtubeUrl:
      "https://www.youtube.com/results?search_query=idea+to+roadmap+product+session",
  },
  {
    title: "AI crash course: the first working slice",
    duration: "18 min",
    body: "The fastest honest path from a blank page to a demo worth showing a customer.",
    image: "/images/vibecoding-ai.jpg",
    alt: "AI assistant interface on a laptop screen",
    youtubeUrl:
      "https://www.youtube.com/results?search_query=build+a+working+app+with+ai+beginner",
  },
  {
    title: "MVP scoping vs feature creep",
    duration: "15 min",
    body: "The framing that keeps a sprint small enough to ship and honest enough to learn from.",
    image: "/images/vibecoding-code.jpg",
    alt: "Close-up of hands coding on a laptop",
    youtubeUrl:
      "https://www.youtube.com/results?search_query=mvp+scoping+product+manager",
  },
];

export default function ResourcesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Resources"
        title="Practical content, no filler."
        description="Short guides and sessions on the workflow that matters: framing the problem, scoping the build, and shipping the first working slice."
      />

      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-[min(80%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section>
              <Reveal>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-ink-900">
                    <PenLine aria-hidden="true" className="h-5 w-5 text-lavender-200" />
                  </span>
                  <h2 className="text-[1.375rem] leading-snug">Guides</h2>
                </div>
              </Reveal>
              <div className="mt-6 space-y-4">
                {GUIDES.map((guide, index) => (
                  <Reveal key={guide.title} delay={index * 60}>
                    <article className="group rounded-md border border-neutral-300 bg-white p-6 transition-all duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-md">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                        Guide · {guide.minutes} min read
                      </p>
                      <h3 className="mt-2 text-[1.125rem] leading-snug">
                        {guide.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                        {guide.body}
                      </p>
                      <Link
                        href="/contact"
                        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 hover:text-terracotta-500"
                      >
                        Ask a follow-up on this guide
                      </Link>
                    </article>
                  </Reveal>
                ))}
              </div>
            </section>

            <section>
              <Reveal delay={80}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-ink-900">
                    <ListVideo aria-hidden="true" className="h-5 w-5 text-lavender-200" />
                  </span>
                  <h2 className="text-[1.375rem] leading-snug">Watch</h2>
                </div>
              </Reveal>
              <div className="mt-6 space-y-4">
                {WATCH.map((video, index) => {
                  return (
                    <Reveal key={video.title} delay={index * 60}>
                      <a
                        href={video.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block overflow-hidden rounded-md border border-neutral-300 bg-white transition-all duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-md"
                      >
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={video.image}
                            alt={video.alt}
                            loading="lazy"
                            className="h-44 w-full object-cover"
                          />
                          <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-900 shadow-lg">
                            <Play
                              aria-hidden="true"
                              className="ml-0.5 h-5 w-5"
                            />
                          </span>
                          <span className="absolute right-4 top-4 rounded-full bg-ink-950/70 px-2.5 py-1 font-sans text-[10px] font-semibold text-white">
                            Session · {video.duration}
                          </span>
                        </div>
                        <div className="p-6">
                          <h3 className="text-[1.125rem] leading-snug">
                            {video.title}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                            {video.body}
                          </p>
                          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 group-hover:text-terracotta-500">
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
                })}
              </div>
            </section>
          </div>

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
                  <h2 className="mt-3 text-[1.75rem] leading-[1.2]">
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