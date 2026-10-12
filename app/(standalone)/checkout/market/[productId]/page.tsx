import type { Metadata } from "next";

import { CheckoutView, getCheckoutMetadata } from "@/components/checkout/checkout-view";

export const dynamic = "force-dynamic";

interface MarketCheckoutPageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({
  params,
}: MarketCheckoutPageProps): Promise<Metadata> {
  const { productId } = await params;
  return getCheckoutMetadata(productId);
}

export default async function MarketCheckoutPage({
  params,
}: MarketCheckoutPageProps) {
  const { productId } = await params;
  return <CheckoutView productId={productId} />;
}
