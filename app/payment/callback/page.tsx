import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  OrderServiceError,
  verifyCheckoutPayment,
} from "@/lib/services/order-service";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PaymentCallbackProps {
  searchParams: Promise<{ reference?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Payment status | Rapid Launch" };
}

interface CallbackState {
  variant: "PAID" | "DISCREPANCY" | "PENDING" | "UNVERIFIED";
  title: string;
  message: string;
  totalMinor?: number;
  currency?: string;
}

export default async function PaymentCallbackPage({
  searchParams,
}: PaymentCallbackProps) {
  const rawReference = (await searchParams).reference;
  const reference = Array.isArray(rawReference)
    ? rawReference[0]
    : rawReference ?? undefined;

  let state: CallbackState = {
    variant: "UNVERIFIED",
    title: "We couldn't confirm this payment",
    message:
      "Payments are verified by our server after you complete them on Paystack. Check your email for confirmation, or contact us and we will look it up for you.",
  };

  if (reference) {
    try {
      const result = await verifyCheckoutPayment(reference);

      if (result.paymentStatus === "PAID" && !result.discrepancy) {
        state = {
          variant: "PAID",
          title: "Payment confirmed",
          message:
            "Your payment was verified and your order is paid. You will receive the correct next step — course enrollment, a scheduling link, or an onboarding conversation — by email.",
          totalMinor: result.totalMinor,
          currency: result.currency,
        };
      } else if (result.discrepancy || result.paymentStatus === "SUSPICIOUS") {
        state = {
          variant: "DISCREPANCY",
          title: "We're checking this payment manually",
          message:
            "Something about this payment doesn't match its order. We have flagged it for review and will contact you — please do not make a second payment.",
        };
      } else {
        state = {
          variant: "PENDING",
          title: "Payment not yet confirmed",
          message:
            "We haven't received confirmation of this payment yet. If you completed a payment on Paystack, it may still be processing. Retry in a moment or contact us.",
        };
      }
    } catch (error) {
      if (
        error instanceof OrderServiceError &&
        error.code === "PAYSTACK_NOT_CONFIGURED"
      ) {
        state = {
          variant: "UNVERIFIED",
          title: "Payment verification is being set up",
          message:
            "Secure payment verification isn't online yet. We will confirm your payment manually — contact us with your order details and we will help.",
        };
      }
    }
  }

  const tone =
    state.variant === "PAID"
      ? "success"
      : state.variant === "DISCREPANCY"
        ? "error"
        : state.variant === "PENDING"
          ? "pending"
          : "neutral";

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="mx-auto w-full max-w-[440px] flex-1 px-6 py-16 lg:py-24">
        <Badge tone={tone}>{tone === "success" ? "Paid" : tone === "error" ? "Action required" : tone === "pending" ? "Processing" : "Unconfirmed"}</Badge>
        <h1 className="mt-4 text-[1.75rem] leading-[1.2]">{state.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-neutral-500">
          {state.message}
        </p>

        {state.totalMinor !== undefined ? (
          <dl className="mt-8 rounded-[12px] border border-neutral-300 bg-neutral-100 p-6">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-sm text-neutral-500">Amount paid</dt>
              <dd className="text-sm font-bold text-neutral-950">
                {formatPrice(state.totalMinor, state.currency)}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
          <Link href="/" className={buttonStyles({ variant: "primary" })}>
            Back to homepage
          </Link>
          <Link
            href="/contact"
            className={buttonStyles({ variant: "secondary" })}
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}