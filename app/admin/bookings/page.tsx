import type { Metadata } from "next";
import Link from "next/link";

import { BookingFilters } from "@/components/admin/booking-filters";
import { BookingsTable } from "@/components/admin/bookings-table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminBookings } from "@/lib/services/admin-service";
import {
  BOOKING_RANGES,
  BOOKING_SORTS,
  type BookingRange,
  type BookingSort,
} from "@/types/booking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bookings | Rapid Launch Back office",
};

function bookingsHref(status: string, range: string | undefined, sort: string | undefined, page = 1) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (range) params.set("range", range);
  if (sort && sort !== "schedule") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/bookings${qs ? `?${qs}` : ""}`;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; range?: string; sort?: string; page?: string }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const status = sp.status ?? "";
  const rangeParam = sp.range ?? "";
  const range: BookingRange | undefined =
    rangeParam === "" || !BOOKING_RANGES.some((r) => r === rangeParam)
      ? undefined
      : (rangeParam as BookingRange);
  const sortParam = sp.sort ?? "";
  const sort: BookingSort =
    sortParam === "recent" ? "recent" : "schedule";
  const page = Number(sp.page) || 1;

  const data = await getAdminBookings({ status, range, sort, page, pageSize: 25 });

  return (
    <div className="admin-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-950">Bookings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upcoming and past sessions, with meeting links and what each customer
          told you before booking.
        </p>
      </div>

      <BookingFilters status={status} range={range} sort={sort} />

      {data.rows.length === 0 ? (
        <EmptyState
          title="No bookings to show"
          description="No sessions match this view. Try another filter, or bookings will appear once customers schedule sessions."
          action={
            <Link
              href="/admin/bookings"
              className="rounded-pill bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-terracotta-500"
            >
              Clear filters
            </Link>
          }
        />
      ) : (
        <BookingsTable rows={data.rows} />
      )}

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {data.totalPages} ({data.total} bookings)
          </p>
          <div className="flex gap-3">
            {data.page > 1 ? (
              <Link
                href={bookingsHref(status, range, sort, data.page - 1)}
                className="rounded-pill border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Previous
              </Link>
            ) : null}
            {data.page < data.totalPages ? (
              <Link
                href={bookingsHref(status, range, sort, data.page + 1)}
                className="rounded-pill border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}