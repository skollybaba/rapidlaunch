import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccountNav } from "@/components/account/account-nav";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getPurchasesForUser } from "@/lib/services/account-service";
import { formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Purchases | Rapid Launch",
};

function statusTone(status: string) {
  switch (status) {
    case "PAID":
    case "FULFILLED":
      return "success";
    case "PENDING":
    case "PROCESSING":
      return "pending";
    case "FAILED":
    case "CANCELLED":
    case "REFUNDED":
      return "error";
    default:
      return "neutral";
  }
}

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const purchases = await getPurchasesForUser(String(user._id));

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-16 lg:px-8 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          My account
        </p>
        <h1 className="mt-2 text-[38px] leading-[1.286] md:text-[1.75rem]">Purchases</h1>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <AccountNav />

          <div>
            {purchases.length ? (
              <ul className="space-y-3">
                {purchases.map((purchase) => (
                  <li
                    key={purchase.id}
                    className="flex flex-col gap-3 rounded-[12px] border border-neutral-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-950">
                        {purchase.itemTitle}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {purchase.orderReference} · {formatDate(purchase.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 sm:shrink-0">
                      <span className="text-sm font-bold text-neutral-950">
                        {purchase.status === "PAID"
                          ? formatPrice(purchase.totalMinor, purchase.currency)
                          : "—"}
                      </span>
                      <Badge tone={statusTone(purchase.status)}>
                        {purchase.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-[16px] border border-neutral-300 bg-white p-10 text-center">
                <p className="text-neutral-500">
                  You haven&apos;t made any purchases yet. When you buy a book,
                  course, or session while signed in, it shows up here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
