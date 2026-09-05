import { displayPrice, getDisplayCurrency } from "@/lib/pricing";

export async function Price({
  amountMinor,
  currency,
  className,
}: {
  amountMinor: number;
  currency: string;
  className?: string;
}) {
  const displayCurrency = await getDisplayCurrency();
  const price = displayPrice(amountMinor, currency, displayCurrency);
  return <span className={className}>{price.label}</span>;
}