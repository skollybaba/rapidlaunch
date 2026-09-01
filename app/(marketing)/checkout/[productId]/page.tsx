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
      ? `${product.title} — Checkout | Rapid Launch`
      : "Checkout | Rapid Launch",
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { productId } = await params;
  const product = await getPublishedProductById(productId);

  if (!product) notFound();

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="mx-auto w-full max-w-[440px] flex-1 px-6 py-16 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          Checkout
        </p>
        <h1 className="mt-3 text-[1.75rem] leading-[1.2]">{product.title}</h1>

        <div className="mt-10 rounded-md border border-neutral-300 bg-neutral-100 p-6">
          <dl className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-sm text-neutral-500">Price</dt>
              <dd className="text-sm font-bold text-neutral-950">
                {formatPrice(product.priceMinor, product.currency)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-sm text-neutral-500">What happens next</dt>
              <dd className="text-right text-sm text-neutral-700">
                Your payment is verified before access is granted — then receive
                the correct next step: course enrollment in Google Classroom, a
                scheduling link, or an onboarding conversation.
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6">
          <CheckoutForm productId={product.id} disabled={product.priceMinor <= 0} />
        </div>

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
  );
}