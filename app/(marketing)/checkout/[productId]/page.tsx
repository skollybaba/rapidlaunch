import type { Metadata } from "next";

import { CheckoutView, getCheckoutMetadata } from "@/components/checkout/checkout-view";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({
  params,
}: CheckoutPageProps): Promise<Metadata> {
  const { productId } = await params;
  return getCheckoutMetadata(productId);
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { productId } = await params;
  return <CheckoutView productId={productId} />;
}
