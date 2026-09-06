import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountNav } from "@/components/account/account-nav";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getPurchasesForUser,
  getSessionsForUser,
} from "@/lib/services/account-service";
import { formatPrice, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account | Rapid Launch",
};

function statusTone(status: string) {
  switch (status) {
    case "PAID":
    case "CONFIRMED":
    case "FULFILLED":
      return "success";
    case "PENDING":
    case "SCHEDULED":
    case "PROCESSING":
      return "pending";
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
      return "error";
    default:
      return "neutral";
  }
}

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const [purchases, sessions] = await Promise.all([
    getPurchasesForUser(String(user._id)),
    getSessionsForUser(String(user._id)),
  ]);

  const upcoming = sessions
    .filter((s) => s.isUpcoming)
    .sort(
      (a, b) =>
        new Date(a.scheduledStartTime!).getTime() -
        new Date(b.scheduledStartTime!).getTime()
    );

  const paidCount = purchases.filter((p) => p.status === "PAID").length;

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-16 lg:px-8 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          My account
        </p>
        <h1 className="mt-2 text-[38px] leading-[1.286] md:text-[1.75rem]">
          Welcome back{user.name ? `, ${user.name}` : ""}
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <AccountNav />

          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
                  Purchases
                </p>
                <p className="mt-2 text-3xl font-bold text-neutral-950">
                  {purchases.length}
                </p>
              </div>
              <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
                  Paid
                </p>
                <p className="mt-2 text-3xl font-bold text-neutral-950">
                  {paidCount}
                </p>
              </div>
              <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
                  Upcoming sessions
                </p>
                <p className="mt-2 text-3xl font-bold text-neutral-950">
                  {upcoming.length}
                </p>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-[19px] leading-snug md:text-[1.125rem]">Upcoming sessions</h2>
                <Link
                  href="/account/sessions"
                  className="text-sm font-medium text-terracotta-600 hover:text-terracotta-500"
                >
                  View all
                </Link>
              </div>
              {upcoming.length ? (
                <ul className="mt-4 space-y-3">
                  {upcoming.slice(0, 3).map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center justify-between gap-4 rounded-[12px] border border-neutral-300 bg-white p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">
                          {session.productTitle}
                        </p>
                        <p className="mt-0.5 text-sm text-neutral-500">
                          {session.scheduledStartTime
                            ? formatDate(session.scheduledStartTime)
                            : "Time to be confirmed"}
                        </p>
                      </div>
                      <Badge tone={statusTone(session.status)}>
                        {session.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-[12px] border border-neutral-300 bg-white p-6 text-center">
                  <p className="text-sm text-neutral-500">
                    No upcoming sessions. When you book a session, it shows up
                    here.
                  </p>
                  <Link
                    href="/book"
                    className={buttonStyles({
                      variant: "primary",
                      className: "mt-4",
                    })}
                  >
                    Book a session
                  </Link>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-[19px] leading-snug md:text-[1.125rem]">Recent purchases</h2>
                <Link
                  href="/account/orders"
                  className="text-sm font-medium text-terracotta-600 hover:text-terracotta-500"
                >
                  View all
                </Link>
              </div>
              {purchases.length ? (
                <ul className="mt-4 space-y-3">
                  {purchases.slice(0, 4).map((purchase) => (
                    <li
                      key={purchase.id}
                      className="flex items-center justify-between gap-4 rounded-[12px] border border-neutral-300 bg-white p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-950">
                          {purchase.itemTitle}
                        </p>
                        <p className="mt-0.5 text-sm text-neutral-500">
                          {formatDate(purchase.createdAt)} ·{" "}
                          {formatPrice(purchase.totalMinor, purchase.currency)}
                        </p>
                      </div>
                      <Badge tone={statusTone(purchase.status)}>
                        {purchase.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-[12px] border border-neutral-300 bg-white p-6 text-center">
                  <p className="text-sm text-neutral-500">
                    You haven&apos;t made any purchases yet. They&apos;ll appear here for
                    you to track.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
