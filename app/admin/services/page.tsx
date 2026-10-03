import type { Metadata } from "next";
import Link from "next/link";

import { ServiceConfigControl } from "@/components/admin/service-config-control";
import { EmptyState } from "@/components/ui/empty-state";
import { Price } from "@/components/ui/price";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminServices } from "@/lib/services/admin-service";
import { offeringForServiceSlug } from "@/lib/services/lead-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services | Rapid Launch Back office",
};

const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "Session",
  MVP_SERVICE: "Build",
};

export default async function AdminServicesPage() {
  await requireAdmin();

  const services = await listAdminServices();

  return (
    <div className="admin-enter space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950">Services</h1>
        <p className="mt-1 text-sm text-neutral-500">
          The engagements shown in the Founders catalogue. Change how each one
          sells, or take it out of the catalogue while you rework it.
        </p>
      </div>

      {services.length === 0 ? (
        <EmptyState
          title="No engagements yet"
          description="Publish a session or build engagement and it will appear in the Founders catalogue automatically."
          action={
            <Link
              href="/admin/submissions"
              className="rounded-lg bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-action-hover"
            >
              View submissions
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {services.map((service) => (
            <li
              key={service.id}
              className="rounded-xl border border-neutral-300 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                      {TYPE_LABELS[service.type] ?? service.type}
                    </span>
                    <span
                      className={
                        service.status === "PUBLISHED"
                          ? "rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900"
                          : service.status === "DRAFT"
                            ? "rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900"
                            : "rounded-lg bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700"
                      }
                    >
                      {service.status.toLowerCase()}
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-neutral-950">
                    {service.title}
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    /services/{service.slug}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-900">
                    {service.priceMinor > 0 ? (
                      <Price
                        amountMinor={service.priceMinor}
                        currency={service.currency}
                      />
                    ) : (
                      "Quoted per project"
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {service.leadCount === 0
                      ? "No enquiries yet"
                      : `${service.leadCount} ${service.leadCount === 1 ? "enquiry" : "enquiries"}`}
                  </p>
                </div>
              </div>

              <ServiceConfigControl
                serviceId={service.id}
                initialStatus={service.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"}
                initialInquiryMode={
                  service.inquiryMode as "NONE" | "INTEREST" | "QUOTE"
                }
                initialFulfillmentMode={
                  service.fulfillmentMode === "SCHEDULER" ||
                  service.fulfillmentMode === "MANUAL"
                    ? service.fulfillmentMode
                    : undefined
                }
              />

              <div className="mt-4 flex flex-wrap gap-3 border-t border-neutral-200 pt-4">
                {offeringForServiceSlug(service.slug) ? (
                  <Link
                    href={`/admin/submissions?offering=${offeringForServiceSlug(service.slug)}`}
                    className="text-xs font-semibold text-action-hover hover:underline"
                  >
                    View its submissions
                  </Link>
                ) : null}
                {service.status === "PUBLISHED" ? (
                  <Link
                    href={`/services/${service.slug}`}
                    className="text-xs font-semibold text-neutral-600 hover:underline"
                  >
                    View live page
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-neutral-500">
        Titles, descriptions and prices are not changed here. Editing a price is
        a catalogue decision and belongs with the owner.
      </p>
    </div>
  );
}