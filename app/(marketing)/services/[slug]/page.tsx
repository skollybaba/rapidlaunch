import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, MessageSquareQuote, FileCode2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { DetailList } from "@/components/catalog/detail-list";
import { ProductCover } from "@/components/ui/product-cover";
import { Reveal } from "@/components/marketing/reveal";
import { getPublishedProductBySlug } from "@/lib/services/catalog-service";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { ProductDetail } from "@/types/product";

export const dynamic = "force-dynamic";

interface ServiceDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function resolveService(slug: string) {
  const product = await getPublishedProductBySlug(slug);
  if (!product) return null;
  if (product.type !== "CONSULTATION" && product.type !== "MVP_SERVICE") {
    return null;
  }
  return product;
}

export async function generateMetadata({
  params,
}: ServiceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await resolveService(slug);
  if (!product) return { title: "Service not found" };
  return {
    title: product.seoTitle ?? `${product.title} | Rapid Launch`,
    description:
      product.seoDescription ?? product.shortDescription ?? "A Rapid Launch service.",
  };
}

const AFTER_PURCHASE_STEPS = [
  {
    title: "Payment is verified",
    body: "Your payment is confirmed with the provider before anything moves forward.",
  },
  {
    title: "You get the next step",
    body: "A scheduling flow for sessions, or an onboarding call to kick off the sprint.",
  },
  {
    title: "You keep the outcome",
    body: "A written next-step plan after a session, or source code and documentation after a sprint.",
  },
];

function ServiceContent({ product }: { product: ProductDetail }) {
  const isMvp = product.type === "MVP_SERVICE";
  const consultation = product.consultationDetails;
  const mvp = product.mvpServiceDetails;

  const priceLabel = isMvp
    ? mvp?.startingPriceMinor
      ? `From ${formatPrice(mvp.startingPriceMinor, product.currency)}`
      : "Custom quote"
    : formatPrice(product.priceMinor, product.currency);

  return (
    <div className="mx-auto w-[min(80%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
        <article className="max-w-[680px]">
          <div className="mb-8 overflow-hidden rounded-md border border-neutral-300">
            {isMvp ? (
              <ProductCover
                type={product.type}
                title={product.title}
                subtitle={product.shortDescription}
                format="landscape"
              />
            ) : (
              <div className="relative aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/collab-brainstorm.jpg"
                  alt="Founder and consultant mapping a roadmap on sticky notes"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-4 left-4 rounded-full bg-ink-950/70 px-3 py-1 font-sans text-[10px] font-semibold text-white">
                  One-on-one · live session
                </span>
              </div>
            )}
          </div>
          <Badge>{isMvp ? "MVP build" : "Consultation"}</Badge>
          <h1 className="mt-4 text-[1.25rem] leading-[1.16] md:text-[1.5rem]">
            {product.title}
          </h1>
          {product.shortDescription ? (
            <p className="mt-4 text-lg leading-[1.55] text-neutral-500">
              {product.shortDescription}
            </p>
          ) : null}
          {product.description ? (
            <div className="mt-8 space-y-4">
              {product.description.split("\n\n").map((paragraph, index) => (
                <p key={index} className="text-base leading-relaxed text-neutral-700">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}

          {!isMvp && consultation?.sessionTypes?.length ? (
            <section className="mt-10">
              <h2 className="text-[1.375rem] leading-snug">Session types</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {consultation.sessionTypes.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {isMvp && mvp?.deliverables?.length ? (
            <section className="mt-10">
              <h2 className="text-[1.375rem] leading-snug">
                What you take away
              </h2>
              <ul className="mt-4 space-y-3">
                {mvp.deliverables.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-base leading-relaxed text-neutral-700"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-1 h-5 w-5 shrink-0 text-terracotta-600"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {isMvp && mvp?.scope ? (
            <section className="mt-10">
              <h2 className="text-[1.375rem] leading-snug">Scope</h2>
              <p className="mt-3 text-base leading-relaxed text-neutral-700">
                {mvp.scope}
              </p>
            </section>
          ) : null}

          {!isMvp && consultation?.preparationInstructions ? (
            <section className="mt-10 rounded-md border border-neutral-300 bg-neutral-100 p-6">
              <h2 className="text-[1.25rem] leading-snug">Before the session</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                {consultation.preparationInstructions}
              </p>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="text-[1.375rem] leading-snug">
              What happens after you buy
            </h2>
            <div className="mt-4 space-y-4">
              {AFTER_PURCHASE_STEPS.map((step, index) => (
                <Reveal key={step.title} delay={index * 60}>
                  <div className="flex items-start gap-4 rounded-md border border-neutral-300 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-neutral-950">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </article>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-md border border-neutral-300 bg-white p-6">
            <dl className="divide-y divide-neutral-100">
              {isMvp ? (
                <>
                  {mvp?.startingPriceMinor ? (
                    <DetailList.Row
                      label="Starting price"
                      value={formatPrice(mvp.startingPriceMinor, product.currency)}
                    />
                  ) : null}
                  {mvp?.quoteMode ? (
                    <DetailList.Row
                      label="Pricing"
                      value="Quoted after discovery"
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {consultation?.durationMinutes ? (
                    <DetailList.Row
                      label="Duration"
                      value={formatDuration(consultation.durationMinutes) ?? ""}
                    />
                  ) : null}
                  {consultation?.bookingMode ? (
                    <DetailList.Row
                      label="Booking"
                      value={
                        consultation.bookingMode === "EXTERNAL_SCHEDULER"
                          ? "Online scheduler"
                          : "Arranged directly"
                      }
                    />
                  ) : null}
                </>
              )}
            </dl>
            <p className="mt-5 text-3xl font-bold text-neutral-950">{priceLabel}</p>

            {product.priceMinor > 0 ? (
              <Link
                href={`/checkout/${product.id}`}
                className={buttonStyles({
                  variant: "primary",
                  size: "lg",
                  className: "mt-6 w-full",
                })}
              >
                Buy this {isMvp ? "deposit" : "session"}
              </Link>
            ) : (
              <Link
                href="/contact"
                className={buttonStyles({
                  variant: "primary",
                  size: "lg",
                  className: "mt-6 w-full",
                })}
              >
                Tell me about your idea
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/contact"
              className={buttonStyles({
                variant: "secondary",
                className: "mt-3 w-full",
              })}
            >
              Ask a question first
            </Link>
          </div>

          {!isMvp ? (
            <div className="mt-6 rounded-md border border-neutral-300 bg-neutral-100 p-6">
              <h2 className="text-sm font-semibold text-neutral-950">Policies</h2>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-500">
                {consultation?.reschedulePolicy ? (
                  <li className="flex items-start gap-2">
                    <MessageSquareQuote
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-600"
                    />
                    {consultation.reschedulePolicy}
                  </li>
                ) : null}
                {consultation?.cancellationPolicy ? (
                  <li className="flex items-start gap-2">
                    <MessageSquareQuote
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-600"
                    />
                    {consultation.cancellationPolicy}
                  </li>
                ) : null}
                {isMvp ? (
                  <li className="flex items-start gap-2">
                    <FileCode2
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-600"
                    />
                    Source code is handed over at the end of the sprint.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const { slug } = await params;
  const product = await resolveService(slug);
  if (!product) notFound();

  return (
    <div className="flex flex-1 flex-col bg-white">
      <ServiceContent product={product} />
    </div>
  );
}