import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  GraduationCap,
  Play,
} from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";
import {
  AgentIllustration,
  ApiIllustration,
  AuthIllustration,
  DatabaseIllustration,
  DeploymentIllustration,
  LearningPathIllustration,
  VibecodingIllustration,
} from "@/components/ui/illustrations";
import { buttonStyles } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rapid Launch",
  description:
    "Launch and test your ideas faster. Gain clarity on what to build, learn the practical way of building with AI, and ship a scalable first slice.",
};

const TOPICS = [
  {
    title: "AI agents",
    body: "How an agent coordinates tools, memory, and a human goal, and how you can build your own.",
    illustration: AgentIllustration,
  },
  {
    title: "Vibecoding",
    body: "Turning a plain-language idea into code and a working screen with AI.",
    illustration: VibecodingIllustration,
  },
  {
    title: "Databases",
    body: "How applications store, organise, and return information, and how you set one up.",
    illustration: DatabaseIllustration,
  },
  {
    title: "APIs",
    body: "How two applications exchange structured requests and responses.",
    illustration: ApiIllustration,
  },
  {
    title: "Authentication",
    body: "How a system knows who you are and what you can access.",
    illustration: AuthIllustration,
  },
  {
    title: "Deployment",
    body: "How code moves from your machine to a live product your users can reach.",
    illustration: DeploymentIllustration,
  },
];

const STATS = [
  { value: "60 min", label: "to a clearer strategy than weeks of debate" },
  { value: "1st slice", label: "shipped before the roadmap is fully painted" },
  { value: "2 wd", label: "for every inquiry to get a personal reply" },
];

function TopicNavigator() {
  return (
    <section className="bg-paper-50">
      <div className="mx-auto w-[min(80%,96rem)] px-6 py-16 lg:px-8 lg:py-24">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            Learn how to build with AI
          </p>
          <h2 className="mt-3 max-w-3xl text-[1.75rem] leading-[1.2]">
            The building blocks, one visual at a time.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-[1.55] text-neutral-500">
            Learn the practical way of building with AI and building a scalable
            solution with it. We cover AI agents and vibecoding through to
            databases, APIs, authentication, and deployment.
          </p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic, index) => {
            const Art = topic.illustration;
            return (
              <Reveal key={topic.title} delay={index * 60}>
                <Link
                  href="/courses"
                  className="group flex h-full flex-col overflow-hidden rounded-md border border-neutral-300 bg-white transition-all duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-md"
                >
                  <div className="p-4">
                    <Art className="h-44 w-full rounded-sm object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col p-6 pt-2">
                    <h3 className="text-[1.25rem] leading-snug">
                      {topic.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">
                      {topic.body}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-terracotta-600 transition-colors duration-[var(--duration-fast)] group-hover:text-terracotta-500">
                      Learn with the course
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BuildWithAISection() {
  return (
    <section className="bg-ink-900">
      <div className="mx-auto w-[min(80%,96rem)] px-6 py-16 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lavender-200">
              Build with AI
            </p>
            <h2 className="mt-3 text-[1.75rem] leading-[1.2] text-white">
              Building has taken a new trajectory: you can build with a team
              and build with AI.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-neutral-300">
              It is no longer about assembling a system from scratch. Learn how
              to produce software that a developer can pick up tomorrow and
              keep writing into. It stays scalable, shareable, and real.
            </p>
            <ol className="mt-8 space-y-5">
              {[
                { k: "Clarify", d: "Frame the problem and the outcome in plain language." },
                { k: "Scope", d: "Define the first slice a real customer can react to." },
                { k: "Build", d: "Ship working software with AI in days, not months." },
                { k: "Scale", d: "Keep your code shareable so a team can continue." },
              ].map((step, index) => (
                <li key={step.k} className="flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lavender-100 font-sans text-xs font-bold text-ink-800">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[1.125rem] font-bold leading-snug text-white">
                      {step.k}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-neutral-300">
                      {step.d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row">
              <Link
                href="/courses"
                className={buttonStyles({ variant: "primary", theme: "dark", size: "lg" })}
              >
                <GraduationCap aria-hidden="true" className="h-4 w-4" />
                Browse AI courses
              </Link>
              <Link
                href="/services/mvp-build"
                className={buttonStyles({ variant: "secondary", theme: "dark", size: "lg" })}
              >
                Build your first slice
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-md border border-white/10 bg-ink-950/60 p-4">
              <LearningPathIllustration className="h-64 w-full rounded-sm" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-white/10 bg-ink-900/70 p-3">
                  <p className="font-sans text-xs font-bold text-lavender-200">
                    Understand
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                    What the idea actually is.
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-ink-900/70 p-3">
                  <p className="font-sans text-xs font-bold text-lavender-200">
                    See
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                    A real example in motion.
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-ink-900/70 p-3">
                  <p className="font-sans text-xs font-bold text-lavender-200">
                    Build
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                    Your first working slice.
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-ink-900/70 p-3">
                  <p className="font-sans text-xs font-bold text-lavender-200">
                    Continue
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                    Kept live by a real team.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden bg-ink-950">
        <div
          aria-hidden="true"
          className="animate-drift absolute inset-0 bg-[radial-gradient(90%_70%_at_18%_8%,var(--color-ink-700)_0%,var(--color-ink-900)_48%,var(--color-ink-950)_100%)]"
        />
        <div className="relative mx-auto w-[min(80%,96rem)] px-6 py-20 lg:px-8 lg:py-28">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_520px]">
            <div className="max-w-2xl">
              <Reveal>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lavender-200">
                  For founders &amp; product managers
                </p>
                <h1 className="mt-4 text-[2.375rem] leading-[1.08] tracking-tight text-white md:text-[3.25rem]">
                  Launch and test your ideas faster.
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-[1.55] text-neutral-300">
                  Stop debating and start validating. Get the clarity you need
                  to build with AI and ship a product a team can keep
                  writing into tomorrow. One session, not a whole build cycle.
                </p>
                <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <Link
                    href="/services/90-minute-one-on-one-strategy-session"
                    className={buttonStyles({
                      variant: "primary",
                      theme: "dark",
                      size: "lg",
                    })}
                  >
                    Book a clarity session
                    <CalendarClock aria-hidden="true" className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/resources"
                    className={buttonStyles({
                      variant: "secondary",
                      theme: "dark",
                      size: "lg",
                    })}
                  >
                    <Play aria-hidden="true" className="h-4 w-4" />
                    Watch the latest video
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal delay={160} className="hidden lg:block">
              <div className="animate-artwork-in rounded-md border border-white/10 bg-ink-900/70 p-3 shadow-2xl shadow-ink-950/50">
                <VibecodingIllustration className="h-[21rem] w-full rounded-sm" />
                <div className="mt-3 flex items-center justify-between px-1">
                  <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-lavender-200">
                    Idea → working screen
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-600" />
                    <span className="text-[10px] font-semibold text-lavender-200">
                      verified
                    </span>
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <dl className="mt-16 grid max-w-3xl grid-cols-1 gap-6 border-t border-white/10 pt-8 sm:grid-cols-3">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dd className="font-sans text-2xl font-bold text-white">
                    {stat.value}
                  </dd>
                  <dt className="mt-1 text-sm leading-relaxed text-neutral-500">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      <TopicNavigator />

<section className="bg-neutral-100">
        <div className="mx-auto w-[min(80%,96rem)] px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                Who this is for
              </p>
              <h2 className="mt-3 text-[1.75rem] leading-[1.2]">
                Built for founders, built for the builders
              </h2>
              <p className="mt-4 text-lg leading-[1.55] text-neutral-500">
                Whatever your starting point, the workflow is the same: gain
                clarity, learn the practical way of building with AI, and ship a
                first working slice someone can react to.
              </p>
              <div className="mt-8 space-y-4">
                <div className="rounded-md border border-neutral-300 bg-white p-6">
                  <h3 className="text-[1.25rem] leading-snug">Founders</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                    Launch and test your idea faster. In a clarity session you
                    tell us what you want to build, and we help you focus on
                    what to build now across a realistic slice you can ship.
                    We also size the team it really takes to move.
                  </p>
                  <Link
                    href="/services/90-minute-one-on-one-strategy-session"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-terracotta-600 transition-colors duration-[var(--duration-fast)] hover:text-terracotta-500"
                  >
                    Book a clarity session
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
                <div className="rounded-md border border-neutral-300 bg-white p-6">
                  <h3 className="text-[1.25rem] leading-snug">Product managers</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                    Learn to build your product yourself for almost zero cost, using
                    AI agents, coding, databases, APIs, authentication, and
                    deployment. You build it, you own it, and it scales without
                    a developer.
                  </p>
                  <Link
                    href="/courses"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-terracotta-600 transition-colors duration-[var(--duration-fast)] hover:text-terracotta-500"
                  >
                    Learn how to build with AI
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="flex h-full flex-col justify-center rounded-md border border-neutral-300 bg-white p-4">
                <AgentIllustration className="h-72 w-full rounded-sm bg-lavender-100" />
                <div className="mt-3 flex items-center justify-between px-1">
                  <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-terracotta-600">
                    Founder + agent team-up
                  </span>
                  <span className="rounded-full bg-lavender-100 px-3 py-1 font-sans text-[10px] font-semibold text-ink-700">
                    you build it
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <BuildWithAISection />

      <section className="bg-ink-950">
        <div className="relative mx-auto w-[min(80%,96rem)] px-6 py-20 text-center lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="text-[1.75rem] leading-[1.2] text-white">
              Get clarity on your product before you spend on code.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.55] text-neutral-300">
              Book a one-on-one session to set up your product and launch faster
              without a whole tech team. Every purchase is verified and
              followed by the right next step: a course enrollment, a session,
              or an onboarding conversation.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/services/90-minute-one-on-one-strategy-session"
                className={buttonStyles({
                  variant: "primary",
                  theme: "dark",
                  size: "lg",
                })}
              >
                Book a clarity session
              </Link>
              <Link
                href="/contact"
                className={buttonStyles({
                  variant: "secondary",
                  theme: "dark",
                  size: "lg",
                })}
              >
                Get a recommendation
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}