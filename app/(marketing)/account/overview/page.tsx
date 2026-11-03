import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  CalendarClock,
  GraduationCap,
  Package,
} from "lucide-react";

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
  title: "My account | Agile Minds Hub",
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

const QUICK_ACTIONS = [
  {
    href: "/book",
    label: "Book a session",
    hint: "1-on-1 clarity with the founder",
    icon: CalendarClock,
  },
  {
    href: "/courses",
    label: "Browse courses",
    hint: "Learn to build with AI",
    icon: GraduationCap,
  },
  {
    href: "/account/orders",
    label: "Track purchases",
    hint: "Orders, access and receipts",
    icon: Package,
  },
] as const;

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

  const firstName = (user.name ?? "").split(/\s+/)[0] || "";

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 pb-16 pt-16 lg:px-8 lg:pb-24 lg:pt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          My account
        </p>

        {/* Welcome hub */}
        <section className="admin-enter mt-3 rounded-[20px] border border-ink-900 bg-ink-950 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="mt-1 text-[1.6rem] font-bold leading-tight text-white md:text-[2rem]">
                {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
              </h1>
              <p className="mt-2 max-w-[52ch] text-sm text-white/70">
                Everything you own in one place — your purchases, live course
                access, and booked sessions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition-colors duration-[var(--duration-fast)] hover:bg-terracotta-100"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
                    {action.label}
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-neutral-400 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <AccountNav />

          <div className="admin-enter space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Purchases", value: purchases.length, icon: Package },
                { label: "Paid", value: paidCount, icon: ArrowUpRight },
                {
                  label: "Upcoming sessions",
                  value: upcoming.length,
                  icon: CalendarClock,
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="group rounded-[16px] border border-neutral-300 bg-white p-5 transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(17_18_29_/_6%)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
                        {stat.label}
                      </p>
                      <span
                        aria-hidden="true"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-600 transition-transform duration-[var(--duration-fast)] group-hover:scale-110"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-950">
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </div>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-[19px] leading-snug md:text-[1.125rem]">
                  Upcoming sessions
                </h2>
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
                      className="group flex items-center gap-4 rounded-[12px] border border-neutral-300 bg-white p-4 transition-colors duration-[var(--duration-fast)] hover:border-neutral-500"
                    >
                      <span
                        aria-hidden="true"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender-100 text-ink-700 transition-transform duration-[var(--duration-fast)] group-hover:scale-105"
                      >
                        <CalendarClock className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-950">
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
                <div className="mt-4 rounded-[12px] border border-dashed border-neutral-300 bg-white p-6 text-center">
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
                <h2 className="text-[19px] leading-snug md:text-[1.125rem]">
                  Recent purchases
                </h2>
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
                      className="group flex items-center gap-4 rounded-[12px] border border-neutral-300 bg-white p-4 transition-colors duration-[var(--duration-fast)] hover:border-neutral-500"
                    >
                      <span
                        aria-hidden="true"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-600 transition-transform duration-[var(--duration-fast)] group-hover:scale-105"
                      >
                        <Package className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
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
                <div className="mt-4 rounded-[12px] border border-dashed border-neutral-300 bg-white p-6 text-center">
                  <p className="text-sm text-neutral-500">
                    You haven&apos;t made any purchases yet. They&apos;ll appear
                    here for you to track.
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
