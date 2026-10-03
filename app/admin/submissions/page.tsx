import type { Metadata } from "next";
import Link from "next/link";

import { LeadStatusControl } from "@/components/admin/lead-status-control";
import { EmptyState } from "@/components/ui/empty-state";
import { Price } from "@/components/ui/price";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminLeads } from "@/lib/services/lead-service";
import {
  LEAD_OFFERINGS,
  LEAD_OFFERING_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadOffering,
  type LeadStatus,
} from "@/types/lead";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submissions | Rapid Launch Back office",
};

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  ...LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_LABELS[status] })),
];

function submissionsHref(status: string, offering: string, page = 1) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (offering) params.set("offering", offering);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/submissions${qs ? `?${qs}` : ""}`;
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactElement;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-800">
        {value}
      </dd>
    </div>
  );
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; offering?: string; page?: string }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const statusParam = sp.status ?? "";
  const offeringParam = sp.offering ?? "";
  const page = Number(sp.page) || 1;

  const status =
    statusParam && LEAD_STATUSES.includes(statusParam as LeadStatus)
      ? (statusParam as LeadStatus)
      : undefined;
  const offering =
    offeringParam && LEAD_OFFERINGS.includes(offeringParam as LeadOffering)
      ? (offeringParam as LeadOffering)
      : undefined;

  const data = await listAdminLeads({ status, offering, page, pageSize: 20 });

  return (
    <div className="admin-enter space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950">Submissions</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enquiries from the Founders catalogue. Interest forms expect a scope
          call and a payment link; quote forms expect a written quote before
          anything is payable.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === ""
              ? Object.values(data.counts).reduce((sum, n) => sum + n, 0)
              : data.counts[tab.value as LeadStatus];
          const active = statusParam === tab.value;
          return (
            <Link
              key={tab.value || "all"}
              href={submissionsHref(tab.value, offeringParam)}
              className={
                active
                  ? "rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              }
            >
              {tab.label}
              <span className={active ? "ml-2 text-white/70" : "ml-2 text-neutral-400"}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={submissionsHref(statusParam, "")}
          className={
            !offeringParam
              ? "rounded-lg bg-action px-4 py-1.5 text-xs font-semibold text-white"
              : "rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          }
        >
          Every engagement
        </Link>
        {LEAD_OFFERINGS.map((option) => (
          <Link
            key={option}
            href={submissionsHref(statusParam, option)}
            className={
              offeringParam === option
                ? "rounded-lg bg-action px-4 py-1.5 text-xs font-semibold text-white"
                : "rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            }
          >
            {LEAD_OFFERING_LABELS[option]}
          </Link>
        ))}
      </div>

      {data.leads.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Enquiries from the Founders catalogue will land here. Nothing to triage right now."
          action={
            <Link
              href="/admin/submissions"
              className="rounded-lg bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-action-hover"
            >
              Clear filters
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {data.leads.map((lead) => (
            <li
              key={lead.id}
              className="rounded-xl border border-neutral-300 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-neutral-950">
                    {lead.name}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    <a href={`mailto:${lead.email}`} className="hover:underline">
                      {lead.email}
                    </a>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-action">
                    {lead.offering ? LEAD_OFFERING_LABELS[lead.offering] : "Unknown"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {lead.productTitle ?? "No linked engagement"}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-neutral-400">
                Received{" "}
                {lead.createdAt
                  ? new Date(lead.createdAt).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "unknown date"}
              </p>

              <LeadStatusControl
                leadId={lead.id}
                initialStatus={lead.status}
                initialNotes={lead.notes}
              />

              <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-neutral-200 pt-4 sm:grid-cols-2">
                {lead.whatYouAreBuilding ? (
                  <Detail label="What they are building" value={lead.whatYouAreBuilding} />
                ) : null}
                {lead.helpNeeded ? (
                  <Detail label="Help they need" value={lead.helpNeeded} />
                ) : null}
                {lead.projectScope ? (
                  <Detail label="Project scope" value={lead.projectScope} />
                ) : null}
                {lead.requirements ? (
                  <Detail label="Additional requirements" value={lead.requirements} />
                ) : null}
                {lead.currentStage ? (
                  <Detail label="Current stage" value={lead.currentStage} />
                ) : null}
                {lead.timeline ? <Detail label="Timeline" value={lead.timeline} /> : null}
                {lead.teamSize ? <Detail label="Team size" value={lead.teamSize} /> : null}
                {lead.company ? <Detail label="Company" value={lead.company} /> : null}
                {lead.phone ? <Detail label="Phone" value={lead.phone} /> : null}
                {lead.website ? (
                  <Detail
                    label="Website"
                    value={
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-action-hover underline"
                      >
                        {lead.website}
                      </a>
                    }
                  />
                ) : null}
                {lead.budgetMinor ? (
                  <Detail
                    label="Stated budget"
                    value={
                      <Price
                        amountMinor={lead.budgetMinor}
                        currency={lead.budgetCurrency ?? "NGN"}
                      />
                    }
                  />
                ) : null}
              </dl>

              <p className="mt-4 rounded-sm border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
                {lead.requiresQuote ? (
                  <>
                    Quote expected before payment. Nothing is payable until a
                    quote is sent.
                  </>
                ) : lead.listedPriceMinor ? (
                  <>
                    Listed price{" "}
                    <Price
                      amountMinor={lead.listedPriceMinor}
                      currency={lead.currency ?? "NGN"}
                    />
                    {" "}
                    — confirm scope, then send a payment link.
                  </>
                ) : (
                  "Confirm scope before sending a payment link."
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {data.totalPages} ({data.total} submissions)
          </p>
          <div className="flex gap-3">
            {data.page > 1 ? (
              <Link
                href={submissionsHref(statusParam, offeringParam, data.page - 1)}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Previous
              </Link>
            ) : null}
            {data.page < data.totalPages ? (
              <Link
                href={submissionsHref(statusParam, offeringParam, data.page + 1)}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-100"
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