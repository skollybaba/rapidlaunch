import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublishedProductById } from "@/lib/services/catalog-service";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { buttonStyles } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({
  params,
}: CheckoutPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getPublishedProductById(productId);
  return {
    title: product
      ? `${product.title} · Checkout | Rapid Launch`
      : "Checkout | Rapid Launch",
  };
}

const NEXT_STEPS = [
  {
    title: "Your payment is verified",
    body: "Paystack confirms the payment on our server before anything is granted.",
  },
  {
    title: "You get a confirmation email",
    body: "Your receipt and every next step are sent straight to your inbox.",
  },
  {
    title: "Your session is booked",
    body: "We add the session to your Google Calendar with a Google Meet link, and email you the details.",
  },
];

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { productId } = await params;
  const product = await getPublishedProductById(productId);

  if (!product) notFound();

  const isSession =
    product.type === "CONSULTATION" &&
    product.consultationDetails?.bookingMode === "EXTERNAL_SCHEDULER";
  const durationMinutes = product.consultationDetails?.durationMinutes;

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[min(80%,96rem)] flex-1 px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
              Checkout
            </p>
            <h1 className="mt-3 text-[1.75rem] leading-[1.2]">
              {product.title}
            </h1>
            {product.shortDescription ? (
              <p className="mt-3 max-w-md text-base leading-relaxed text-neutral-500">
                {product.shortDescription}
              </p>
            ) : null}

            <div className="mt-8 rounded-[12px] border border-neutral-300 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[1.125rem] leading-snug">Order summary</h2>
                <span className="font-sans text-sm font-medium text-neutral-500">
                  {isSession && durationMinutes
                    ? `${durationMinutes} min`
                    : product.type === "COURSE"
                      ? "Online course"
                      : product.type === "BOOK"
                        ? "Digital book"
                        : "One-on-one"}
                </span>
              </div>
              <dl className="mt-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-sm text-neutral-500">Price</dt>
                  <dd className="text-sm font-bold text-neutral-950">
                    {formatPrice(product.priceMinor, product.currency)}
                  </dd>
                </div>
                {isSession ? (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-sm text-neutral-500">Format</dt>
                    <dd className="text-right text-sm text-neutral-700">
                      Live session
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="mt-6 rounded-[12px] border border-neutral-300 bg-white p-6">
              <h2 className="text-[1.125rem] leading-snug">
                What happens next
              </h2>
              <ol className="mt-5 space-y-5">
                {NEXT_STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lavender-100 font-sans text-xs font-bold text-ink-700">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-950">
                        {step.title}
                      </h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-neutral-500">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div>
            <CheckoutForm
              productId={product.id}
              isSession={isSession}
              sessionDurationMinutes={durationMinutes}
              disabled={product.priceMinor <= 0}
            />

            <Link
              href="/contact"
              className={buttonStyles({
                variant: "secondary",
                className: "mt-6 w-full",
              })}
            >
              Question before you buy?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}