import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Compass,
  Globe2,
  GraduationCap,
  Layers,
  MapPin,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";
import { buttonStyles } from "@/components/ui/button";
import { getProfileSettings } from "@/lib/services/profile-settings-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Oluwasegun Kolawole | Agile Minds Hub",
  description:
    "Oluwasegun Kolawole is a product leader with over a decade in tech, eight years in product, and a track record of building software used by millions and teaching thousands more to build with AI.",
};

const STATS = [
  { value: "10+", label: "years in tech" },
  { value: "8+", label: "years in product" },
  { value: "80M+", label: "identities enrolled" },
  { value: "10,000+", label: "people trained" },
];

const PATH = [
  {
    step: "01",
    period: "The engineer years",
    title: "Learned how software is actually built",
    body: "Started as a software engineer for two years. That grounding still shapes every product decision: what is realistic, what is expensive, and what is worth building at all.",
  },
  {
    step: "02",
    period: "The product years",
    title: "Turned technical depth into product judgement",
    body: "Moved into product management and has spent more than eight years leading products across identity, fintech, and payments, from early definition to scale.",
  },
  {
    step: "03",
    period: "Now",
    title: "Building, teaching, and using AI as leverage",
    body: "Works as a product leader at a leading fintech company and vibe codes: using AI to take ideas from a blank page to working software without waiting on a full engineering team.",
  },
];

const IMPACT = [
  {
    icon: Building2,
    metric: "80M+",
    title: "Identities enrolled",
    body: "Contributed to software delivered with the World Bank and the National Identity Management Commission (NIMC) that has enrolled over 80 million Nigerians into the National Identity Database.",
  },
  {
    icon: Globe2,
    metric: "5 markets",
    title: "Fintech at real scale",
    body: "Led product on fintech and payment solutions running across the UK, the US, Canada, Nigeria, and several African markets, spanning mobile and web applications.",
  },
  {
    icon: GraduationCap,
    metric: "10,000+",
    title: "People trained",
    body: "As a TME Education Ambassador in Nigeria for Transfer Multisort Elektronik (Poland), trained over 10,000 people in tech across 18 states and 24 cities.",
  },
  {
    icon: MapPin,
    metric: "18 states",
    title: "Community built",
    body: "Reached 24 cities through training and community work, including co-organising Google community events such as DevFest and Google I/O Extended.",
  },
];

const PRINCIPLES = [
  {
    icon: Compass,
    title: "Start with the problem",
    body: "The best product decision is usually the one that removes work, not the one that adds a feature. Clarity comes before code.",
  },
  {
    icon: Layers,
    title: "Build to learn",
    body: "A working slice teaches you more than a perfect plan. Ship something real, put it in front of people, and let the evidence lead.",
  },
  {
    icon: Users,
    title: "Teach the workflow",
    body: "Knowledge is only useful when it changes what someone can do. Every course and session ends with something the learner can apply.",
  },
  {
    icon: Sparkles,
    title: "Use AI as leverage",
    body: "AI collapses the distance between an idea and a working product. It does not replace judgement, structure, or the responsibility to verify.",
  },
];

const STAGES = [
  "DevFest",
  "Google I/O Extended",
  "LinkedIn events",
  "Business Analysis School Conference",
];

export default async function AboutPage() {
  const profile = await getProfileSettings();

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden bg-ink-950">
        <div
          aria-hidden="true"
          className="animate-drift absolute inset-0 bg-[radial-gradient(90%_70%_at_18%_8%,var(--color-ink-700)_0%,var(--color-ink-900)_48%,var(--color-ink-950)_100%)]"
        />
        <div className="relative mx-auto w-[98%] px-6 py-16 md:w-[min(83%,96rem)] lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <Reveal className="order-2 lg:order-1">
              <div className="relative mx-auto max-w-md lg:mx-0">
                <div
                  aria-hidden="true"
                  className="absolute -left-3 -top-3 h-full w-full rounded-lg border border-terracotta-500/40"
                />
                <div className="relative overflow-hidden rounded-lg border border-white/10 bg-ink-900 shadow-2xl shadow-ink-950/60">
                  {profile.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={profile.imageUrl}
                      alt="Portrait of Oluwasegun Kolawole, product leader and founder of Agile Minds Hub"
                      className="aspect-[4/5] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center bg-[radial-gradient(120%_90%_at_50%_0%,var(--color-ink-700)_0%,var(--color-ink-900)_62%)]">
                      <span className="font-sans text-7xl font-extrabold tracking-tight text-lavender-200">
                        OK
                      </span>
                      <span className="mt-4 px-8 text-center text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                        Oluwasegun Kolawole
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 border-t border-white/10 bg-ink-900 px-5 py-4">
                    <div>
                      <p className="text-sm font-bold text-white">
                        Oluwasegun Kolawole
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        Product leader · Builder · Teacher
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success-600" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lavender-200">
                        Agile Minds Hub
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120} className="order-1 lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lavender-200">
                About Oluwasegun
              </p>
              <h1 className="mt-4 text-[42px] font-extrabold leading-[1.05] tracking-tight text-white md:text-[3.75rem]">
                Product leader.
                <br />
                Builder. Teacher.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-[1.55] text-neutral-300">
                More than a decade in tech, eight years in product, and a
                habit of building the thing instead of only describing it. I
                help people turn ideas into products they can actually launch.
              </p>
              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/book"
                  className={buttonStyles({
                    variant: "primary",
                    theme: "dark",
                    size: "lg",
                  })}
                >
                  Work with me
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link
                  href="/courses"
                  className={buttonStyles({
                    variant: "secondary",
                    theme: "dark",
                    size: "lg",
                  })}
                >
                  Explore the course
                </Link>
              </div>
              <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-6 border-t border-white/10 pt-8 sm:grid-cols-4">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <dd className="font-sans text-2xl font-bold tabular-nums text-white">
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
        </div>
      </section>

      <section className="bg-paper-50">
        <div className="mx-auto w-[98%] px-6 py-16 md:w-[min(83%,96rem)] lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                The short version
              </p>
              <h2 className="mt-3 text-[32px] leading-[1.286] md:text-[1.75rem]">
                I understand what users need, and I can build it myself.
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <div className="max-w-[680px] space-y-4 text-base leading-relaxed text-neutral-700">
                <p>
                  My path into product started in engineering. Two years of
                  writing software taught me how products are really made, and
                  more importantly, where they break. When I moved into product
                  management, I brought that reality with me.
                </p>
                <p>
                  Over the last eight years I have led product on identity,
                  fintech, and payment systems used at national and
                  international scale. I have worked with the World Bank and
                  NIMC on software that enrolled over 80 million Nigerians, and
                  led payment products across the UK, the US, Canada, Nigeria,
                  and several African markets.
                </p>
                <p>
                  Alongside that work, I have spent years teaching. As a TME
                  Education Ambassador, I have trained over 10,000 people across
                  18 states and 24 cities, and I have co-organised Google
                  community events including DevFest and Google I/O Extended.
                  Today I also use AI to build product-centric software from
                  scratch, taking ideas to working products without waiting on a
                  full engineering team.
                </p>
                <p className="text-neutral-950">
                  Agile Minds Hub is where those threads meet: think like a product
                  manager, build like an engineer, and launch real software with
                  AI.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-neutral-100">
        <div className="mx-auto w-[98%] px-6 py-16 md:w-[min(83%,96rem)] lg:px-8 lg:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
              The path
            </p>
            <h2 className="mt-3 max-w-3xl text-[32px] leading-[1.286] md:text-[1.75rem]">
              From writing code to leading product to teaching the workflow.
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PATH.map((item, index) => (
              <Reveal key={item.step} delay={index * 80}>
                <div className="flex h-full flex-col rounded-md border border-neutral-300 bg-white p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-terracotta-600">
                      {item.period}
                    </span>
                    <span className="font-mono text-xs font-semibold tabular-nums text-neutral-500">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[24px] leading-snug md:text-[1.25rem]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-[98%] px-6 py-16 md:w-[min(83%,96rem)] lg:px-8 lg:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
              The work
            </p>
            <h2 className="mt-3 max-w-3xl text-[32px] leading-[1.286] md:text-[1.75rem]">
              Products and programmes that reached people at scale.
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {IMPACT.map((item, index) => (
              <Reveal key={item.title} delay={index * 70}>
                <div className="flex h-full flex-col rounded-md border border-neutral-300 p-6 transition-colors duration-[var(--duration-standard)] hover:border-ink-700">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-ink-900">
                      <item.icon
                        aria-hidden="true"
                        className="h-5 w-5 text-lavender-200"
                      />
                    </span>
                    <div>
                      <p className="text-sm font-bold tabular-nums text-terracotta-600">
                        {item.metric}
                      </p>
                      <h3 className="text-[24px] leading-snug md:text-[1.25rem]">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-neutral-500">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-900">
        <div className="mx-auto w-[98%] px-6 py-16 md:w-[min(83%,96rem)] lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lavender-200">
                Teaching &amp; community
              </p>
              <h2 className="mt-3 text-[32px] leading-[1.286] text-white md:text-[1.75rem]">
                Teaching is part of the work, not a side project.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-neutral-300">
                The same instinct runs through the courses, books, and sessions:
                make the path clear, show the work, and help people build
                something they can keep using.
              </p>
              <div className="mt-8 rounded-md border border-white/10 bg-ink-950 p-6">
                <Mic
                  aria-hidden="true"
                  className="h-5 w-5 text-terracotta-100"
                />
                <p className="mt-4 text-sm font-bold uppercase tracking-[0.14em] text-lavender-200">
                  On stage
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                  Speaking on product, technology, and career growth at events
                  including:
                </p>
                <ul className="mt-4 space-y-2 text-sm font-semibold text-white">
                  {STAGES.map((stage) => (
                    <li key={stage} className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta-500"
                      />
                      {stage}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-ink-950 p-6">
                  <GraduationCap
                    aria-hidden="true"
                    className="h-6 w-6 text-terracotta-100"
                  />
                  <h3 className="mt-4 text-[24px] leading-snug text-white md:text-[1.25rem]">
                    TME Education Ambassador
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                    Representing Transfer Multisort Elektronik (Poland) in
                    Nigeria, training over 10,000 people in technology across 18
                    states and 24 cities.
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-ink-950 p-6">
                  <Users
                    aria-hidden="true"
                    className="h-6 w-6 text-terracotta-100"
                  />
                  <h3 className="mt-4 text-[24px] leading-snug text-white md:text-[1.25rem]">
                    Google community events
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                    Co-organiser of Google community events in Nigeria,
                    including DevFest and Google I/O Extended, helping builders
                    learn in public and in person.
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-ink-950 p-6 sm:col-span-2">
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-lavender-200">
                    The throughline
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-neutral-300">
                    Product work taught me what to build. Teaching taught me how
                    to explain it. Building with AI taught me how much one
                    person can ship. Agile Minds Hub brings all three together.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-paper-50">
        <div className="mx-auto w-[98%] px-6 py-16 md:w-[min(83%,96rem)] lg:px-8 lg:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
              How I work
            </p>
            <h2 className="mt-3 max-w-3xl text-[32px] leading-[1.286] md:text-[1.75rem]">
              Four principles behind every course, session, and build.
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {PRINCIPLES.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 70}>
                <div className="h-full rounded-md border border-neutral-300 bg-white p-6">
                  <principle.icon
                    aria-hidden="true"
                    className="h-6 w-6 text-terracotta-600"
                  />
                  <h3 className="mt-4 text-[24px] leading-snug md:text-[1.25rem]">
                    {principle.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                    {principle.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-950">
        <div className="relative mx-auto w-[98%] max-w-4xl px-6 py-16 text-center md:w-[min(83%,96rem)] lg:px-8 lg:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lavender-200">
              Why Agile Minds Hub exists
            </p>
            <h2 className="mt-3 text-[32px] leading-[1.286] text-white md:text-[1.75rem]">
              Think like a product manager. Build like an engineer. Launch with
              AI.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.55] text-neutral-300">
              Founders do not lack ideas. They lack the bridge between an idea
              and correct execution. That bridge is what I teach, and what I
              build with the people I work with.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/courses"
                className={buttonStyles({
                  variant: "primary",
                  theme: "dark",
                  size: "lg",
                })}
              >
                Explore the vibe coding course
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
                Ask a question
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
