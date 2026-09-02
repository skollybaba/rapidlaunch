import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked, Compass, Layers, MessageSquareQuote } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { Reveal } from "@/components/marketing/reveal";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Rapid Launch",
  description:
    "Rapid Launch exists to turn product ideas into buildable plans through consulting, AI courses, practical books, and MVP builds.",
};

const PILLARS = [
  {
    icon: Compass,
    title: "Strategy before code",
    body: "The highest-leverage work is deciding what to build and why. Everything here starts with a sharper problem and a clear next decision.",
  },
  {
    icon: Layers,
    title: "Learn by shipping",
    body: "Courses are shortcuts to the workflow, not theory dumps. You apply each idea to your own product as you go.",
  },
  {
    icon: MessageSquareQuote,
    title: "Human guidance",
    body: "Posts, books, and sessions come from real product work, not recycled generic advice. If you need a tailored answer, ask directly.",
  },
  {
    icon: BookMarked,
    title: "Outcomes you keep",
    body: "A plan you own, source code in your hands, skills you keep using after the engagement ends.",
  },
];

const CHAPTERS = [
  {
    period: "The testing ground",
    body: "Early product work was a rapid cycle of assumptions, prototypes, and customer interviews. We learned which instincts hold up and which die on contact with reality.",
  },
  {
    period: "The AI shift",
    body: "Watching AI collapse the distance between an idea and a working prototype changed how products get built and who can build them. Rapid Launch started as a way to teach that workflow properly.",
  },
  {
    period: "Now",
    body: "A focused practice: consulting for founders who are stuck, courses for builders who want the workflow, and MVP sprints for ideas ready to ship in waves.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="About"
        title="Why Rapid Launch exists."
        description="Founders don't lack ideas. They lack the bridge between an idea and correct execution. Rapid Launch is that bridge, built from real product work and not from generic advice."
      />

      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-[min(80%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[2fr_1fr]">
            <Reveal>
              <article className="max-w-[680px]">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                  The founder&apos;s view
                </p>
                <h2 className="mt-3 text-[1.75rem] leading-[1.2]">
                  Product instinct is learnable, and AI makes it go further.
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-neutral-700">
                  <p>
                    Every product starts as a belief about people: that they
                    have a problem, that they will care enough to act, that a
                    solution can reach them. The craft of product management is
                    testing those beliefs cheaply and turning what survives into
                    a buildable plan.
                  </p>
                  <p>
                    Rapid Launch exists because that craft was never taught as a
                    working method. It was picked up through painful launches.
                    Add AI to the stack and the same method moves faster, which
                    is both an opportunity and a trap: speed without structure
                    ships the wrong thing sooner.
                  </p>
                  <p>
                    So Rapid Launch teaches structure, then speed. Consulting for
                    the decisive moment, courses for the workflow, books for the
                    thinking, and MVP sprints for the build.
                  </p>
                </div>
              </article>
            </Reveal>

            <Reveal delay={100}>
              <div className="space-y-6 lg:sticky lg:top-8">
                <div className="overflow-hidden rounded-md border border-neutral-300 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/about-founder.jpg"
                    alt="The Rapid Launch founder at work in an office"
                    loading="lazy"
                    className="h-80 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-3 bg-white px-5 py-4">
                    <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-terracotta-600">
                      Founder, practice-lead
                    </span>
                    <span className="rounded-full bg-lavender-100 px-3 py-1 font-sans text-[10px] font-semibold text-ink-700">
                      human guidance
                    </span>
                  </div>
                </div>
                <HeroVisual />
                <div className="rounded-md border border-neutral-300 bg-ink-950 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lavender-200">
                    The founding offer set
                  </p>
                  <ul className="mt-4 space-y-4 text-sm text-neutral-300">
                    <li className="flex items-start gap-3">
                      <Compass className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-100" />
                      Strategy sessions that end with a written next step
                    </li>
                    <li className="flex items-start gap-3">
                      <Layers className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-100" />
                      Courses delivered where the work happens
                    </li>
                    <li className="flex items-start gap-3">
                      <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-100" />
                      MVP sprints with source-code handover
                    </li>
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>

          <section className="mt-20">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                The journey
              </p>
              <h2 className="mt-3 text-[1.75rem] leading-[1.2]">
                How this practice came together
              </h2>
            </Reveal>
            <div className="mt-8 space-y-4">
              {CHAPTERS.map((chapter, index) => (
                <Reveal key={chapter.period} delay={index * 70}>
                  <div className="flex flex-col gap-2 rounded-md border border-neutral-300 bg-white p-6 sm:flex-row sm:items-start sm:gap-6">
                    <p className="w-40 shrink-0 text-sm font-bold text-terracotta-600">
                      {chapter.period}
                    </p>
                    <p className="text-base leading-relaxed text-neutral-500">
                      {chapter.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mt-20">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                How we work
              </p>
              <h2 className="mt-3 text-[1.75rem] leading-[1.2]">
                Four principles behind every engagement
              </h2>
            </Reveal>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {PILLARS.map((pillar, index) => (
                <Reveal key={pillar.title} delay={index * 70}>
                  <div className="h-full rounded-md border border-neutral-300 p-6">
                    <pillar.icon
                      aria-hidden="true"
                      className="h-6 w-6 text-terracotta-600"
                    />
                    <h3 className="mt-4 text-[1.25rem] leading-snug">
                      {pillar.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                      {pillar.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-ink-900">
          <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-24">
            <Reveal>
              <h2 className="text-[1.75rem] leading-[1.2] text-white">
                Start with the offer that matches where you are.
              </h2>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/services"
                  className={buttonStyles({
                    variant: "primary",
                    theme: "dark",
                    size: "lg",
                  })}
                >
                  Explore services
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className={buttonStyles({
                    variant: "secondary",
                    theme: "dark",
                    size: "lg",
                  })}
                >
                  <MessageSquareQuote aria-hidden="true" className="h-4 w-4" />
                  Ask a question
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </div>
    </div>
  );
}