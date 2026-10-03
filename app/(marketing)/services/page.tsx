import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarCheck, FileCode2, MessageSquareQuote } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { Reveal } from "@/components/marketing/reveal";
import { ServiceVisual } from "@/components/ui/service-visual";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import { listPublishedProducts } from "@/lib/services/catalog-service";
import { Price } from "@/components/ui/price";
import type { ProductSummary } from "@/types/product";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Founders catalogue | Rapid Launch",
  description:
    "Founders catalogue: consulting sessions and outcome-led MVP builds: product strategy, AI tooling guidance, and launching your idea in shipping waves.",
};

async function ServicesGrid() {
  const services = await listPublishedProducts({
    type: undefined,
    limit: 50,
  }).then((items) =>
    items.filter(
      (product) =>
        product.type === "CONSULTATION" || product.type === "MVP_SERVICE"
    )
  );

  if (services.length === 0) {
    return (
      <EmptyState
        title="No services are available yet"
        description="New engagements are being prepared. Tell us about your project on the contact page and we will get back to you."
        action={
          <a
            href="/contact"
            className={buttonStyles({
              variant: "primary",
              size: "md",
              className: "h-11",
            })}
          >
            Get in touch
          </a>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {services.map((product, index) => (
        <Reveal key={product.id} delay={index * 70}>
          <ServiceCard product={product} />
        </Reveal>
      ))}
    </div>
  );
}

function ServiceCard({ product }: { product: ProductSummary }) {
  const isMvp = product.type === "MVP_SERVICE";
  const Icon = isMvp ? FileCode2 : MessageSquareQuote;

  return (
    <Link
      href={`/services/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-neutral-300 bg-white transition-all duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-md hover:shadow-ink-700/10"
    >
      <ServiceVisual
        imageUrl={product.thumbnailUrl}
        alt={`${product.title} engagement`}
        type={product.type}
        title={product.title}
        subtitle={product.shortDescription}
        format="landscape"
      />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-ink-900">
            <Icon aria-hidden="true" className="h-4 w-4 text-lavender-200" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            {isMvp ? "MVP build" : "Consultation"}
          </span>
        </div>
        <h2 className="mt-3 text-[24px] leading-snug md:text-[1.375rem]">{product.title}</h2>
        {product.shortDescription ? (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">
            {product.shortDescription}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <span className="text-sm font-bold text-neutral-950">
            {isMvp ? (
              "Custom quote"
            ) : (
              <Price
                amountMinor={product.priceMinor}
                currency={product.currency}
              />
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 transition-colors duration-[var(--duration-fast)] group-hover:text-terracotta-500">
            {isMvp ? "Explore the sprint" : "See what it covers"}
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

const HOW_IT_WORKS = [
  {
    title: "Tell us where you are",
    body: "Send a few lines about your idea, team, or the decision you are stuck on. We reply within two working days.",
    icon: MessageSquareQuote,
  },
  {
    title: "We map the path",
    body: "For a consultation you get a forward plan in the session. For an MVP sprint we run discovery and quote a scope you can approve.",
    icon: CalendarCheck,
  },
  {
    title: "You keep the results",
    body: "Sessions end with a written next-step plan. MVP sprints hand over source code and setup documentation.",
    icon: FileCode2,
  },
];

export default function ServicesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Founders catalogue"
        title="Four ways to move your product forward."
        description="Book a strategy session, turn an idea into an MVP, get your product built with AI, or talk to us about a custom build. Every route starts from where you actually are."
      />
      <div className="border-b border-neutral-300 bg-white">
        <div className="mx-auto w-[98%] px-6 py-16 text-center md:w-[min(83%,96rem)] lg:px-8 lg:py-24">
          <Reveal className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
              Choose the engagement
            </p>
            <h2 className="mt-3 text-[32px] leading-[1.286] md:text-[2.25rem]">
              Sessions you can book today, builds we scope with you.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-500">
              Two engagements have a listed price and book straight into a
              session. Two start with a form so we can understand the work
              before anyone pays a naira. Pick the route that matches where you
              are.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="animate-pulse overflow-hidden rounded-md border border-neutral-300 bg-white"
                  >
                    <div className="aspect-video bg-neutral-100" />
                    <div className="p-6">
                      <div className="h-4 w-24 rounded-full bg-neutral-100" />
                      <div className="mt-4 h-6 w-3/4 rounded-md bg-neutral-100" />
                      <div className="mt-3 h-4 w-full rounded-md bg-neutral-100" />
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <ServicesGrid />
          </Suspense>
        </div>

        <section className="bg-neutral-100">
          <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] px-6 py-16 lg:px-8 lg:py-24">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                The engagement
              </p>
              <h2 className="mt-3 max-w-xl text-[32px] leading-[1.286] md:text-[1.75rem]">
                A short process that ends with a clear next decision
              </h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, index) => (
                <Reveal key={step.title} delay={index * 80}>
                  <div className="rounded-md border border-neutral-300 bg-white p-6">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-ink-900">
                      <step.icon
                        aria-hidden="true"
                        className="h-5 w-5 text-lavender-200"
                      />
                    </span>
                    <p className="mt-4 text-xs font-bold text-terracotta-600">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 text-[24px] leading-snug md:text-[1.25rem]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink-900">
          <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-24">
            <Reveal>
              <h2 className="text-[32px] leading-[1.286] md:text-[1.75rem] text-white">
                Not sure which engagement fits?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-300">
                Tell us one sentence about what you are building and we will
                point you at the right next step: a session, a course, or a
                sprint.
              </p>
              <Link
                href="/contact"
                className=                {buttonStyles({
                  variant: "primary",
                  theme: "dark",
                  size: "lg",
                  className: "mt-8",
                })}
              >
                Get a recommendation
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      </div>
    </div>
  );
}