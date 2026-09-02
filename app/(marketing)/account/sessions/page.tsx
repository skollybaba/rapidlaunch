import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccountNav } from "@/components/account/account-nav";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getSessionsForUser } from "@/lib/services/account-service";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sessions | Rapid Launch",
};

function statusTone(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "BOOKED":
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

function SessionList({
  items,
  empty,
}: {
  items: {
    id: string;
    productTitle: string;
    orderReference: string;
    scheduledStartTime?: string | null;
    requestedStartTime?: string | null;
    status: string;
    meetingUrl?: string | null;
  }[];
  empty: string;
}) {
  if (!items.length) {
    return (
      <div className="mt-4 rounded-[12px] border border-neutral-300 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">{empty}</p>
      </div>
    );
  }
  return (
    <ul className="mt-4 space-y-3">
      {items.map((session) => {
        const time =
          session.scheduledStartTime ||
          session.requestedStartTime ||
          "Time to be confirmed";
        return (
          <li
            key={session.id}
            className="rounded-[12px] border border-neutral-300 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-neutral-950">
                  {session.productTitle}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {session.orderReference}
                </p>
                <p className="mt-2 text-sm font-medium text-neutral-950">
                  {typeof time === "string" ? formatDateTime(time) : "Time to be confirmed"}
                </p>
              </div>
              <Badge tone={statusTone(session.status)}>
                {session.status}
              </Badge>
            </div>
            {session.meetingUrl ? (
              <a
                href={session.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm font-medium text-terracotta-600 hover:text-terracotta-500"
              >
                Join session &rarr;
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default async function AccountSessionsPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const sessions = await getSessionsForUser(String(user._id));

  const upcoming = sessions
    .filter((s) => s.isUpcoming)
    .sort(
      (a, b) =>
        new Date(a.scheduledStartTime!).getTime() -
        new Date(b.scheduledStartTime!).getTime()
    );

  const past = sessions
    .filter((s) => !s.isUpcoming)
    .sort(
      (a, b) =>
        new Date(b.scheduledStartTime || b.requestedStartTime || 0).getTime() -
        new Date(a.scheduledStartTime || a.requestedStartTime || 0).getTime()
    );

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[95%] md:w-[min(80%,96rem)] flex-1 px-6 py-16 lg:px-8 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          My account
        </p>
        <h1 className="mt-2 text-[1.75rem] leading-[1.286]">Sessions</h1>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <AccountNav />

          <div className="space-y-10">
            <section>
              <h2 className="text-[1.125rem] leading-snug">Upcoming</h2>
              <SessionList
                items={upcoming}
                empty="No upcoming sessions. Book one and it will appear here."
              />
            </section>

            <section>
              <h2 className="text-[1.125rem] leading-snug">Past</h2>
              <SessionList
                items={past}
                empty="No past sessions yet."
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
