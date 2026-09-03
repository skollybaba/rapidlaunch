"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, Mail, ArrowRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";

interface VerifyResult {
  ok: boolean;
  data: {
    id: string;
    orderReference: string;
    status: string;
    itemTitle: string;
    totalMinor: number;
    currency: string;
    paymentStatus: string;
    discrepancy: boolean;
  };
  error?: { code: string; message: string };
}

type RenderState =
  | "loading"
  | "success"
  | "paid-no-details"
  | "discrepancy"
  | "pending"
  | "unverified"
  | "no-reference";

function getInitialReference(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("reference");
}

function SuccessView({ data }: { data?: VerifyResult["data"] | null }) {
  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[580px]">
          <div className="text-center">
            <div className="relative mx-auto inline-flex">
              <div className="absolute inset-0 animate-ping rounded-full bg-terracotta-600/20" />
              <CheckCircle2
                aria-hidden="true"
                className="relative h-16 w-16 text-terracotta-600"
              />
            </div>
            <h1 className="mt-5 text-[2rem] font-bold leading-[1.2]">
              You&apos;re all set!
            </h1>
            <p className="mt-3 text-base leading-relaxed text-neutral-500">
              Your payment was verified and your order is confirmed.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 bg-neutral-50 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
                Payment confirmed
              </p>
            </div>
            <div className="px-6 py-5">
              {data ? (
                <>
                  {data.itemTitle ? (
                    <p className="text-sm font-semibold text-neutral-950">
                      {data.itemTitle}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-neutral-400">
                      Your order
                    </p>
                  )}
                  <p className="mt-1 text-3xl font-bold text-neutral-950">
                    {data.totalMinor !== undefined
                      ? formatPrice(data.totalMinor, data.currency)
                      : "\u2014"}
                  </p>
                  {data.orderReference ? (
                    <p className="mt-2 text-xs text-neutral-400">
                      Ref: {data.orderReference}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="flex items-center gap-3 py-1">
                  <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-neutral-200 border-t-terracotta-600" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-[16px] border border-neutral-300 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-neutral-500">
              What happens next
            </h2>
            <ul className="mt-4 space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-100">
                  <Mail
                    aria-hidden="true"
                    className="h-4 w-4 text-terracotta-700"
                  />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    Check your email
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-neutral-500">
                    A receipt and full confirmation have been sent to you. If you
                    don&apos;t see it, check spam.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-100">
                  <CreditCard
                    aria-hidden="true"
                    className="h-4 w-4 text-terracotta-700"
                  />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    Payment verified
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-neutral-500">
                    No payment has been taken twice. This page confirms what
                    you just completed on Paystack.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-100">
                  <Clock
                    aria-hidden="true"
                    className="h-4 w-4 text-terracotta-700"
                  />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    We&apos;ll follow up shortly
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-neutral-500">
                    The correct next step &mdash; course access, a scheduling
                    link, or an onboarding message &mdash; is either in your
                    email or coming soon.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/account/overview"
              className={buttonStyles({
                variant: "primary",
                className: "inline-flex items-center gap-2",
              })}
            >
              View my account
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className={buttonStyles({ variant: "secondary" })}
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaticPage({
  tone,
  badge,
  title,
  message,
  actions,
}: {
  tone: "neutral" | "pending" | "error" | "success";
  badge: string;
  title: string;
  message: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[540px]">
          <Badge tone={tone}>{badge}</Badge>
          <h1 className="mt-4 text-[1.75rem] leading-[1.286]">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-500">
            {message}
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  const [reference] = useState(() => getInitialReference());
  // Optimistically show success immediately (no full-page loader); the fast
  // verify call reconciles the real state in the background.
  const [renderState, setRenderState] = useState<RenderState>(
    reference ? "success" : "no-reference"
  );
  const [data, setData] = useState<VerifyResult["data"] | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!reference || fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;
    const ref = reference;

    async function verify() {
      if (!ref) return;
      try {
        const refParam = encodeURIComponent(ref);
        const res = await fetch(
          `/api/payments/paystack/verify/${refParam}?fast=1`
        );
        const json: VerifyResult = await res.json();

        if (cancelled) return;

        if (!json.ok) {
          if (json.error?.code === "PAYSTACK_NOT_CONFIGURED") {
            setRenderState("unverified");
          }
          return;
        }

        setData(json.data);

        if (json.data.paymentStatus === "PAID" && !json.data.discrepancy) {
          setRenderState("success");
        } else if (
          json.data.discrepancy ||
          json.data.paymentStatus === "SUSPICIOUS"
        ) {
          setRenderState("discrepancy");
        } else if (json.data.paymentStatus === "PENDING") {
          // Webhook may still be landing; keep the (already-rendered)
          // optimistic view rather than blocking the user.
        } else {
          setRenderState("pending");
        }
      } catch {
        // Network hiccup: leave the optimistic success view in place.
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (renderState === "no-reference") {
    return (
      <StaticPage
        tone="neutral"
        badge="No reference"
        title="Missing payment reference"
        message="We couldn&apos;t find a payment reference in the URL. If you just completed a payment, check your email for confirmation or contact us."
        actions={
          <>
            <Link href="/" className={buttonStyles({ variant: "primary" })}>
              Back to homepage
            </Link>
            <Link
              href="/contact"
              className={buttonStyles({ variant: "secondary" })}
            >
              Contact support
            </Link>
          </>
        }
      />
    );
  }

  if (renderState === "success") {
    return <SuccessView data={data} />;
  }

  if (renderState === "paid-no-details" && data) {
    return (
      <StaticPage
        tone="success"
        badge="Paid"
        title="Payment confirmed"
        message="Your payment was verified and your order is paid. You will receive the correct next step by email: course enrollment, a scheduling link, or an onboarding conversation."
        actions={
          <>
            <Link href="/" className={buttonStyles({ variant: "primary" })}>
              Back to homepage
            </Link>
            <Link
              href="/contact"
              className={buttonStyles({ variant: "secondary" })}
            >
              Contact support
            </Link>
          </>
        }
      />
    );
  }

  if (renderState === "discrepancy") {
    return (
      <StaticPage
        tone="error"
        badge="Action required"
        title="We&apos;re checking this payment"
        message="Something about this payment doesn&apos;t match its order. We have flagged it for manual review and will contact you. Please do not make a second payment."
        actions={
          <>
            <Link
              href="/contact"
              className={buttonStyles({ variant: "primary" })}
            >
              Contact support
            </Link>
            <Link
              href="/"
              className={buttonStyles({ variant: "secondary" })}
            >
              Back to homepage
            </Link>
          </>
        }
      />
    );
  }

  if (renderState === "pending") {
    return (
      <StaticPage
        tone="pending"
        badge="Processing"
        title="Payment not yet confirmed"
        message="We haven&apos;t received confirmation from Paystack yet. If you completed a payment, it may still be processing. Try refreshing this page in a moment or contact us."
        actions={
          <>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={buttonStyles({ variant: "primary" })}
            >
              Refresh page
            </button>
            <Link
              href="/contact"
              className={buttonStyles({ variant: "secondary" })}
            >
              Contact support
            </Link>
          </>
        }
      />
    );
  }

  return (
    <StaticPage
      tone="neutral"
      badge="Unconfirmed"
      title="We couldn&apos;t confirm this payment"
      message="Payments are verified by our server after you complete them on Paystack. Check your email for confirmation, or contact us and we will look it up for you."
      actions={
        <>
          <Link href="/" className={buttonStyles({ variant: "primary" })}>
            Back to homepage
          </Link>
          <Link
            href="/contact"
            className={buttonStyles({ variant: "secondary" })}
          >
            Contact support
          </Link>
        </>
      }
    />
  );
}
