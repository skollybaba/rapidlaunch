"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ExternalLink, Video } from "lucide-react";

import { BookingCountdown } from "@/components/admin/booking-countdown";
import { FulfillmentActionButton } from "@/components/admin/fulfillment-action-button";
import { DismissBookingButton } from "@/components/admin/dismiss-booking-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { AdminBookingRow } from "@/lib/services/admin-service";
import { cn, formatDateTime } from "@/lib/utils";

function statusTone(status: string): BadgeTone {
  switch (status) {
    case "CONFIRMED":
      return "success";
    case "PENDING":
      return "pending";
    case "ACTION_REQUIRED":
      return "info";
    case "CANCELLED":
      return "neutral";
    default:
      return "error";
  }
}

const ANSWER_FIELDS: { key: keyof NonNullable<AdminBookingRow["answers"]>; label: string }[] = [
  { key: "whatYouAreBuilding", label: "What you're building" },
  { key: "currentStage", label: "Current stage" },
  { key: "helpNeeded", label: "Help needed" },
];

export function BookingsTable({ rows }: { rows: AdminBookingRow[] }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-10 px-4 py-3" aria-label="Details" />
              <th className="px-5 py-3 font-semibold">Session time</th>
              <th className="px-5 py-3 font-semibold">Time remaining</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Session</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Join</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((booking) => {
              const isOpen = expanded.has(booking.id);
              const joinUrl = booking.meetingUrl ?? booking.providerEventUri;
              return (
                <Fragment key={booking.id}>
                  <tr className="transition-colors duration-[var(--duration-fast)] hover:bg-neutral-50">
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => toggle(booking.id)}
                        aria-expanded={isOpen}
                        aria-label={
                          isOpen ? "Hide booking details" : "Show booking details"
                        }
                        className="rounded-full p-1.5 text-neutral-400 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-neutral-300"
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform duration-[var(--duration-fast)]",
                            isOpen && "rotate-180"
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      {booking.scheduledStartTime ? (
                        <p className="font-medium text-neutral-950">
                          {formatDateTime(booking.scheduledStartTime)}
                        </p>
                      ) : (
                        <span className="text-neutral-400">
                          Not scheduled yet
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {booking.scheduledStartTime ? (
                        <BookingCountdown
                          startTime={booking.scheduledStartTime}
                        />
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-neutral-950">
                        {booking.customerName || "—"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {booking.customerEmail}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {booking.productTitle || "Session"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone(booking.status)}>
                        {booking.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      {joinUrl ? (
                        <a
                          href={joinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-pill bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-neutral-800 focus:outline-none focus:ring-[3px] focus:ring-neutral-400"
                        >
                          <Video className="size-3.5" aria-hidden="true" />
                          Join
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={7} className="bg-neutral-50/70 px-5 py-5">
                        <BookingDetails booking={booking} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookingDetails({ booking }: { booking: AdminBookingRow }) {
  const answers = booking.answers;
  const hasAnswers =
    answers &&
    ANSWER_FIELDS.some((field) => Boolean(answers[field.key]?.trim()));

  const canConfirm = booking.status !== "CONFIRMED";
  const isActionable = booking.status === "PENDING" || booking.status === "FAILED";
  const isOrderPaid = booking.orderStatus === "PAID";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          What they shared before booking
        </h4>
        {hasAnswers ? (
          <dl className="mt-3 space-y-3 text-sm">
            {ANSWER_FIELDS.map((field) => {
              const value = answers?.[field.key]?.trim();
              if (!value) return null;
              return (
                <div key={field.key}>
                  <dt className="text-xs font-medium text-neutral-500">
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 text-neutral-900">{value}</dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">
            No pre-booking answers were provided.
          </p>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Scheduling details
        </h4>
        <dl className="mt-3 space-y-3 text-sm">
          {booking.requestedStartTime ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500">
                Requested date &amp; time
              </dt>
              <dd className="mt-0.5 text-neutral-900">
                {formatDateTime(booking.requestedStartTime)}
              </dd>
            </div>
          ) : (
            <div>
              <dt className="text-xs font-medium text-neutral-500">
                Requested date &amp; time
              </dt>
              <dd className="mt-0.5 text-neutral-400">Not picked yet</dd>
            </div>
          )}
          {booking.timezone ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500">
                Timezone
              </dt>
              <dd className="mt-0.5 text-neutral-900">{booking.timezone}</dd>
            </div>
          ) : null}
          {booking.scheduledStartTime && booking.scheduledEndTime ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500">
                Session window
              </dt>
              <dd className="mt-0.5 text-neutral-900">
                {formatDateTime(booking.scheduledStartTime)} –{" "}
                {formatDateTime(booking.scheduledEndTime)}
              </dd>
            </div>
          ) : null}
          {booking.createdAt ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500">
                Booked on
              </dt>
              <dd className="mt-0.5 text-neutral-900">
                {formatDateTime(booking.createdAt)}
              </dd>
            </div>
          ) : null}
        </dl>
        {booking.schedulingUrl ? (
          <a
            href={booking.schedulingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-terracotta-600 hover:text-terracotta-500"
          >
            Open scheduling link
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}

        <div className="mt-6 border-t border-neutral-200 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Payment
          </h4>
          <dl className="mt-3 space-y-3 text-sm">
            {booking.orderReference ? (
              <div>
                <dt className="text-xs font-medium text-neutral-500">
                  Order reference
                </dt>
                <dd className="mt-0.5 font-mono text-xs text-neutral-900">
                  {booking.orderReference}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium text-neutral-500">
                Payment reference
              </dt>
              <dd className="mt-0.5 font-mono text-xs text-neutral-900">
                {booking.paymentReference ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">
                Payment status
              </dt>
              <dd className="mt-0.5 text-neutral-900">
                {booking.paymentStatus
                  ? booking.paymentStatus.replace(/_/g, " ")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-500">
                Order paid
              </dt>
              <dd className="mt-0.5 text-neutral-900">
                {isOrderPaid
                  ? "Yes"
                  : booking.orderStatus
                    ? "No — unpaid"
                    : "Unknown"}
              </dd>
            </div>
          </dl>
        </div>

        {isOrderPaid && canConfirm && booking.orderId ? (
          <div className="mt-5 border-t border-neutral-200 pt-4">
            <p className="text-sm font-semibold text-neutral-900">
              Fulfillment
            </p>
            {booking.requestedStartTime ? (
              <p className="mt-1 text-xs text-neutral-500">
                Create the calendar invite and send the confirmation email for
                this session.
              </p>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">
                The customer has not picked a time yet. Confirm once they do.
              </p>
            )}
            {booking.requestedStartTime ? (
              <FulfillmentActionButton
                orderId={booking.orderId}
                loadingLabel="Confirming…"
                className="mt-3"
              >
                {isActionable ? "Confirm session" : "Retry confirmation"}
              </FulfillmentActionButton>
            ) : null}
          </div>
        ) : null}

        {!isOrderPaid ? (
          <div className="mt-5 border-t border-neutral-200 pt-4">
            <p className="text-sm font-semibold text-neutral-900">
              Unpaid booking
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              This order has not been confirmed as paid. Clear it from the list
              so it stops showing alongside confirmed sessions.
            </p>
            <DismissBookingButton bookingId={booking.id} className="mt-3" />
          </div>
        ) : null}
      </div>
    </div>
  );
}