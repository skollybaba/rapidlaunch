import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarX2,
  Clock,
  Info,
  ListChecks,
  MessageSquareQuote,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProductConsultationDetails } from "@/types/product";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { Reveal } from "@/components/marketing/reveal";
import { buttonStyles } from "@/components/ui/button";
import { getPublishedProductBySlug } from "@/lib/services/catalog-service";
import { formatPrice } from "@/lib/utils";
import type { ProductDetail } from "@/types/product";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a session | Rapid Launch",
  description:
    "Pick the right one-on-one: a strategy session for founders, or a product-management clarity session. Book a slot, pay, and get a Google Meet link on your calendar.",
};

const FOUNDER_SLUG = "90-minute-one-on-one-strategy-session";
const PM_SLUG = "60-minute-product-manager-clarity-session";

interface SessionOption {
  slug: string;
  label: string;
  icon: LucideIcon;
  duration: number;
  accent: string;
}

const OPTIONS: SessionOption[] = [
  {
    slug: FOUNDER_SLUG,
    label: "For founders",
    icon: MessageSquareQuote,
    duration: 90,
    accent: "terracotta",
  },
  {
    slug: PM_SLUG,
    label: "For product managers",
    icon: Timer,
    duration: 60,
    accent: "lavender",
  },
];

async function loadOption(option: SessionOption) {
  const product = await getPublishedProductBySlug(option.slug, "CONSULTATION");
  return { option, product };
}

async function OptionsGrid() {
  const rows = await Promise.all(OPTIONS.map(loadOption));
  const missing = rows.some((row) => !row.product);
  if (missing) notFound();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {rows.map(({ option, product }, index) => (
        <Reveal key={option.slug} delay={index * 90}>
          <OptionCard
            option={option}
            product={product as ProductDetail}
          />
        </Reveal>
      ))}
    </div>
  );
}

const ACCENT_STYLES: Record<
  string,
  { chip: string; badge: string; hover: string }
> = {
  terracotta: {
    chip: "bg-terracotta-600 text-white",
    badge: "bg-terracotta-50 text-terracotta-700 border-terracotta-200",
    hover: "hover:border-terracotta-600",
  },
  lavender: {
    chip: "bg-ink-900 text-lavender-200",
    badge: "bg-lavender-50 text-ink-700 border-lavender-200",
    hover: "hover:border-ink-700",
  },
};

function SectionBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-neutral-100 pt-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
        {title}
      </h3>
      <div className="mt-2 text-sm leading-relaxed text-neutral-600">
        {children}
      </div>
    </div>
  );
}

function OptionCard({
  option,
  product,
}: {
  option: SessionOption;
  product: ProductDetail;
}) {
  const styles = ACCENT_STYLES[option.accent];
  const Icon = option.icon;
  const consultation = product.consultationDetails as
    | ProductConsultationDetails
    | null
    | undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-neutral-300 bg-white transition-all duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:shadow-md hover:shadow-ink-700/10">
      <div className="flex items-center gap-3 border-b border-neutral-100 p-6 pb-5">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-sm ${styles.chip}`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            {option.label}
          </p>
          <h2 className="mt-0.5 text-[1.25rem] leading-snug">
            {product.title}
          </h2>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {product.shortDescription ? (
          <p className="text-sm leading-relaxed text-neutral-500">
            {product.shortDescription}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-sm font-semibold ${styles.badge}`}
          >
            <Clock aria-hidden="true" className="h-4 w-4" />
            {option.duration} minutes
          </span>
          <span className="text-lg font-bold text-neutral-950">
            {formatPrice(product.priceMinor, product.currency)}
          </span>
        </div>

        <div className="mt-5 space-y-5">
          {consultation?.sessionTypes?.length ? (
            <SectionBlock icon={ListChecks} title="What the session covers">
              <ul className="space-y-2">
                {consultation.sessionTypes.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ArrowRight
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-600"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          ) : null}

          {consultation?.preparationInstructions ? (
            <SectionBlock icon={Info} title="Before the session">
              {consultation.preparationInstructions}
            </SectionBlock>
          ) : null}

          {consultation?.reschedulePolicy ? (
            <SectionBlock icon={Clock} title="Rescheduling">
              {consultation.reschedulePolicy}
            </SectionBlock>
          ) : null}

          {consultation?.cancellationPolicy ? (
            <SectionBlock icon={CalendarX2} title="Cancellation">
              {consultation.cancellationPolicy}
            </SectionBlock>
          ) : null}
        </div>

        <div className="mt-6 flex flex-1 items-end">
          <Link
            href={`/checkout/${product.id}`}
            className={buttonStyles({
              variant: "primary",
              className: "h-11 w-full",
            })}
          >
            Book this session
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

const WHAT_HAPPENS = [
  {
    title: "Pick a time that works",
    body: "On checkout you choose a live slot from our calendar. We check it against real availability in real time.",
  },
  {
    title: "Pay to secure the slot",
    body: "Payment is verified by Paystack before anything is granted. Your invoice and receipt land in your inbox.",
  },
  {
    title: "Meet on Google Meet",
    body: "We add the session to your Google Calendar with a Google Meet link, and email you everything you need.",
  },
];

export default function BookPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Book a session"
        title="Two live sessions. Pick the one that fits."
        description="Both are one-on-one, hosted live on Google Meet, and end with a written next-step plan you keep. Choose a slot on the next page, pay, and the event lands on your calendar."
      />

      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-[95%] md:w-[min(80%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <OptionsGrid />
        </div>

        <section className="border-t border-neutral-200 bg-neutral-100">
          <div className="mx-auto w-[95%] md:w-[min(80%,96rem)] px-6 py-16 lg:px-8 lg:py-24">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                What happens next
              </p>
              <h2 className="mt-3 max-w-xl text-[1.75rem] leading-[1.286]">
                From booking to the live call
              </h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {WHAT_HAPPENS.map((step, index) => (
                <Reveal key={step.title} delay={index * 80}>
                  <div className="rounded-md border border-neutral-300 bg-white p-6">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-ink-900">
                      <span className="font-sans text-sm font-bold text-lavender-200">
                        {index + 1}
                      </span>
                    </span>
                    <h3 className="mt-4 text-[1.25rem] leading-snug">
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
      </div>
    </div>
  );
}
