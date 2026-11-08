"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarRange,
  CircleDollarSign,
  FileText,
  Mail,
  Percent,
  PiggyBank,
  Plus,
  ReceiptText,
  Save,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { formatPrice } from "@/lib/utils";
import { StatCard } from "@/components/admin/metrics/stat-card";
import { ProfitTrendChart } from "@/components/admin/metrics/profit-trend-chart";
import { cn } from "@/lib/utils";
import { NETWORK_ERROR_MESSAGE, readApiError } from "@/lib/feedback";
import type { ProfitOverview } from "@/types/profit";

const EXPENSE_CATEGORIES = ["ADS", "SALARY", "SERVER", "CUSTOM"] as const;
type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

interface ExpenseInput {
  category: ExpenseCategory;
  label: string;
  amountMinor: number;
}

interface ProfitCalculation {
  month: string;
  grossMinor: number;
  discountMinor: number;
  netMinor: number;
  paidOrders: number;
  uniqueCustomers: number;
  paystackFeePercent: number;
  paystackFlatFeeMinor: number;
  paystackFeesMinor: number;
  expensesTotalMinor: number;
  expenses: ExpenseInput[];
  notes?: string;
  profitMinor: number;
  currency: "NGN";
}

const inputClass =
  "w-full rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 transition-colors focus:border-terracotta-500 focus:outline-none";

function formatMinor(n: number) {
  return formatPrice(Math.round(n || 0), "NGN");
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type ProfitScope = "month" | "all";

function ProfitCalculator() {
  const searchParams = useSearchParams();

  const [month, setMonth] = useState(
    searchParams.get("month") || new Date().toISOString().slice(0, 7)
  );
  const [feePercent, setFeePercent] = useState(1.5);
  const [flatFeeMinor, setFlatFeeMinor] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseInput[]>([]);
  const [notes, setNotes] = useState("");
  const [calc, setCalc] = useState<ProfitCalculation | null>(null);
  const [savedReports, setSavedReports] = useState<ProfitCalculation[]>([]);
  const [scope, setScope] = useState<ProfitScope>("month");
  const [overview, setOverview] = useState<ProfitOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendEmails, setSendEmails] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/metrics/profit-reports");
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentMonth = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/metrics/profit-reports?month=${month}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          const next = data.data as ProfitCalculation;
          setCalc(next);
          setFeePercent(next.paystackFeePercent);
          setFlatFeeMinor(next.paystackFlatFeeMinor);
          setExpenses(next.expenses ?? []);
          setNotes(next.notes ?? "");
        }
      }
    } catch {
      // Non-fatal: the form stays usable with empty defaults.
    }
  }, [month]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await fetch(
        "/api/admin/metrics/profit-reports?scope=overview",
        { cache: "no-store" }
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          readApiError(payload, "Could not load your all-time profit.")
        );
      }
      setOverview((payload?.data ?? null) as ProfitOverview | null);
    } catch (error) {
      setOverviewError(
        error instanceof TypeError
          ? NETWORK_ERROR_MESSAGE
          : error instanceof Error
            ? error.message
            : "Could not load your all-time profit."
      );
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch the inception-to-date overview on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    // Fetch saved reports on mount; the async loader sets state after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    // Fetch the selected month's report whenever the month changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCurrentMonth();
  }, [loadCurrentMonth]);

  const addExpense = () =>
    setExpenses((prev) => [
      ...prev,
      { category: "ADS", label: "", amountMinor: 0 },
    ]);

  const updateExpense = (
    index: number,
    field: keyof ExpenseInput,
    value: string | number
  ) =>
    setExpenses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  const removeExpense = (index: number) =>
    setExpenses((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!month) {
      setStatus({ type: "error", message: "Choose a month before saving." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/metrics/profit-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          paystackFeePercent: Number.isFinite(feePercent) ? feePercent : 0,
          paystackFlatFeeMinor: Number.isFinite(flatFeeMinor) ? flatFeeMinor : 0,
          expenses,
          notes,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          readApiError(payload, "Could not save the report. Please try again.")
        );
      }
      if (payload?.data) setCalc(payload.data as ProfitCalculation);
      setStatus({ type: "success", message: "Profit report saved." });
      try {
        await loadReports();
      } catch {
        // The save succeeded; refreshing the list is best-effort only.
      }
      try {
        await loadOverview();
      } catch {
        // Totals refresh is best-effort; the saved report remains valid.
      }
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof TypeError
            ? NETWORK_ERROR_MESSAGE
            : error instanceof Error
              ? error.message
              : "Could not save the report. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!sendEmails.trim()) {
      setStatus({ type: "error", message: "Enter at least one email." });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const emails = sendEmails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const res = await fetch(
        `/api/admin/metrics/profit-reports/${month}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: emails }),
        }
      );
      if (!res.ok) throw new Error("send failed");
      setStatus({
        type: "success",
        message: `Report sent to ${emails.length} recipient${
          emails.length === 1 ? "" : "s"
        }.`,
      });
    } catch {
      setStatus({
        type: "error",
        message: "Could not send the email. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const netMinor = calc?.netMinor ?? 0;
  const paidOrders = calc?.paidOrders ?? 0;
  const safeFeePercent = Number.isFinite(feePercent) ? feePercent : 0;
  const safeFlatFee = Number.isFinite(flatFeeMinor) ? flatFeeMinor : 0;
  const expensesTotal = expenses.reduce(
    (sum, e) => sum + (Number.isFinite(e.amountMinor) ? e.amountMinor : 0),
    0
  );
  const paystackFees =
    Math.round((safeFeePercent / 100) * netMinor) + safeFlatFee * paidOrders;
  const estimatedProfit = netMinor - paystackFees - expensesTotal;

  const allTime = overview?.allTime;
  const showingAllTime = scope === "all";
  const firstMonth = overview?.monthly[0]?.month;
  const allTimeValue = (value: number | undefined) =>
    allTime
      ? formatMinor(value ?? 0)
      : overviewLoading
        ? "Loading…"
        : "Unavailable";

  const cardValues = showingAllTime
    ? {
        net: allTimeValue(allTime?.netMinor),
        fees: allTimeValue(allTime?.paystackFeesMinor),
        expenses: allTimeValue(allTime?.expensesTotalMinor),
        profit: allTimeValue(allTime?.profitMinor),
        netHint: allTime
          ? `${allTime.paidOrders} paid order${
              allTime.paidOrders === 1 ? "" : "s"
            }${firstMonth ? ` since ${formatMonthLabel(firstMonth)}` : ""}`
          : overviewLoading
            ? "Loading inception-to-date totals..."
            : "Totals could not be loaded",
        feesHint: allTime
          ? `Saved fee settings · ${allTime.months} month${
              allTime.months === 1 ? "" : "s"
            }`
          : "Saved fee settings per month",
        expensesHint: allTime
          ? `${allTime.months} month${allTime.months === 1 ? "" : "s"} tracked`
          : "Recorded in monthly reports",
        profitPositive: (allTime?.profitMinor ?? 0) >= 0,
        profitHint: allTime
          ? allTime.profitMinor >= 0
            ? `${allTime.profitableMonths} of ${allTime.months} months in profit`
            : `In the red across ${allTime.lossMonths} month${
                allTime.lossMonths === 1 ? "" : "s"
              }`
          : "Inception to date",
      }
    : {
        net: formatMinor(netMinor),
        fees: formatMinor(paystackFees),
        expenses: formatMinor(expensesTotal),
        profit: formatMinor(estimatedProfit),
        netHint: `${paidOrders} paid order${
          paidOrders === 1 ? "" : "s"
        } · ${formatMonthLabel(month)}`,
        feesHint: `${safeFeePercent}% + ${formatMinor(safeFlatFee)} / order`,
        expensesHint: `${expenses.length} line${
          expenses.length === 1 ? "" : "s"
        }`,
        profitPositive: estimatedProfit >= 0,
        profitHint:
          estimatedProfit >= 0 ? "In the green" : "Running a loss",
      };

  return (
    <div className="admin-enter flex flex-1 flex-col">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          Finance
        </p>
        <h1 className="mt-1 text-[32px] leading-[1.286] md:text-[1.75rem]">
          Profit calculator
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Net revenue after Paystack fees and operating expenses. Save and email
          monthly reports.
        </p>
      </header>

      <div className="mt-2 rounded-[16px] border border-neutral-300 bg-white p-3 shadow-[0_2px_8px_rgb(17_18_29_/_4%)] sm:p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 pr-1 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
            <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
            Month
          </span>
          <div className="flex h-9 items-center gap-2 rounded-[10px] border border-neutral-300 bg-white px-3 transition-colors duration-[var(--duration-fast)] hover:border-neutral-500 focus-within:border-terracotta-600 focus-within:ring-[3px] focus-within:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]">
            <CalendarRange
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-neutral-500"
            />
            <label htmlFor="profit-month" className="sr-only">
              Reporting month
            </label>
            <input
              id="profit-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-sm text-neutral-950 tabular-nums focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="admin-enter mt-6 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Profit view scope"
          className="flex rounded-[10px] bg-lavender-100 p-1"
        >
          {(
            [
              { key: "month", label: "This month" },
              { key: "all", label: "Inception to date" },
            ] as const
          ).map((option) => {
            const active = option.key === scope;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setScope(option.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-[7px] px-3 py-1.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "bg-white text-terracotta-600 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-950"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-neutral-500">
          {showingAllTime
            ? overview
              ? `All-time totals · ${overview.allTime.months} month${
                  overview.allTime.months === 1 ? "" : "s"
                } tracked`
              : overviewLoading
                ? "Loading all-time totals..."
                : "All-time totals unavailable"
            : `Live totals for ${formatMonthLabel(month)}`}
        </p>
      </div>

      {showingAllTime && overviewError ? (
        <div
          role="alert"
          className="admin-enter mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-danger-100 bg-danger-100/60 px-4 py-3 text-sm text-danger-600"
        >
          <span>{overviewError}</span>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="rounded-[8px] border border-danger-600/30 bg-white px-3 py-1.5 text-xs font-semibold text-danger-600 transition-colors hover:border-danger-600"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="admin-enter mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Net revenue"
          value={cardValues.net}
          icon={CircleDollarSign}
          hint={cardValues.netHint}
        />
        <StatCard
          label="Paystack fees"
          value={cardValues.fees}
          icon={Percent}
          tone="warning"
          hint={cardValues.feesHint}
        />
        <StatCard
          label="Expenses"
          value={cardValues.expenses}
          icon={ReceiptText}
          tone="danger"
          hint={cardValues.expensesHint}
        />
        <StatCard
          label={showingAllTime ? "Profit to date" : "Estimated profit"}
          value={cardValues.profit}
          icon={PiggyBank}
          tone={cardValues.profitPositive ? "success" : "danger"}
          hint={cardValues.profitHint}
        />
      </div>

      <ProfitTrendChart
        className="admin-enter mt-6"
        points={overview?.monthly ?? []}
        totals={
          allTime ?? {
            netMinor: 0,
            paystackFeesMinor: 0,
            expensesTotalMinor: 0,
            profitMinor: 0,
            paidOrders: 0,
            months: 0,
            profitableMonths: 0,
            lossMonths: 0,
          }
        }
        loading={overviewLoading}
      />

      <div className="admin-enter mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <h2 className="text-base font-bold text-neutral-950">
              Fees & assumptions
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              Applied to this month&apos;s net revenue.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="fee-percent"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Paystack fee %
                </label>
                <input
                  id="fee-percent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={feePercent}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setFeePercent(Number.isFinite(next) ? next : 0);
                  }}
                  className={cn(inputClass, "mt-1")}
                />
              </div>
              <div>
                <label
                  htmlFor="flat-fee"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Flat fee per order (₦)
                </label>
                <input
                  id="flat-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={flatFeeMinor === 0 ? 0 : flatFeeMinor / 100}
                  onChange={(e) =>
                    setFlatFeeMinor(
                      Math.round((parseFloat(e.target.value) || 0) * 100)
                    )
                  }
                  className={cn(inputClass, "mt-1")}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-neutral-950">
                  Expenses
                </h2>
                <p className="mt-0.5 text-sm text-neutral-500">
                  Advertising, salaries, servers and custom costs.
                </p>
              </div>
              <button
                type="button"
                onClick={addExpense}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-terracotta-500 hover:text-terracotta-600"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add
              </button>
            </div>

            {expenses.length === 0 ? (
              <p className="mt-4 rounded-[12px] border border-dashed border-neutral-300 bg-neutral-100 py-6 text-center text-sm text-neutral-500">
                No expenses added yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {expenses.map((expense, idx) => (
                  <li
                    key={idx}
                    className="grid gap-2 rounded-[12px] bg-neutral-100 p-3 sm:grid-cols-[7rem_1fr_9rem_auto]"
                  >
                    <select
                      aria-label={`Expense ${idx + 1} category`}
                      value={expense.category}
                      onChange={(e) =>
                        updateExpense(idx, "category", e.target.value)
                      }
                      className={inputClass}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      aria-label={`Expense ${idx + 1} label`}
                      placeholder="Label (optional)"
                      value={expense.label}
                      onChange={(e) =>
                        updateExpense(idx, "label", e.target.value)
                      }
                      className={inputClass}
                    />
                    <input
                      type="number"
                      aria-label={`Expense ${idx + 1} amount in naira`}
                      placeholder="e.g. 13000"
                      step="0.01"
                      min="0"
                      value={expense.amountMinor === 0 ? "" : expense.amountMinor / 100}
                      onChange={(e) =>
                        updateExpense(
                          idx,
                          "amountMinor",
                          Math.round((parseFloat(e.target.value) || 0) * 100)
                        )
                      }
                      className={cn(inputClass, "text-right")}
                    />
                    <button
                      type="button"
                      onClick={() => removeExpense(idx)}
                      aria-label={`Remove expense ${idx + 1}`}
                      className="inline-flex h-9 w-9 items-center justify-center self-center rounded-[8px] text-neutral-500 transition-colors hover:bg-danger-100 hover:text-danger-600"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <label
              htmlFor="profit-notes"
              className="block text-base font-bold text-neutral-950"
            >
              Notes
            </label>
            <textarea
              id="profit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this month's report..."
              rows={3}
              className={cn(inputClass, "mt-2 resize-y")}
            />
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-terracotta-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              {saving ? "Saving..." : "Save report"}
            </button>
            {status ? (
              <p
                role="status"
                className={cn(
                  "text-sm font-medium",
                  status.type === "success"
                    ? "text-success-600"
                    : "text-danger-600"
                )}
              >
                {status.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <div className="flex items-center gap-2">
              <FileText
                aria-hidden="true"
                className="h-4 w-4 text-terracotta-600"
              />
              <h2 className="text-base font-bold text-neutral-950">
                Saved reports
              </h2>
            </div>
            <ul className="mt-4 max-h-96 space-y-2 overflow-auto">
              {loading ? (
                <li className="py-4 text-center text-sm text-neutral-500">
                  Loading...
                </li>
              ) : savedReports.length === 0 ? (
                <li className="py-4 text-center text-sm text-neutral-500">
                  No saved reports yet.
                </li>
              ) : (
                savedReports.map((r) => (
                  <li key={r.month}>
                    <button
                      type="button"
                      onClick={() => setMonth(r.month)}
                      className={cn(
                        "w-full rounded-[10px] bg-neutral-100 p-3 text-left transition-colors hover:bg-lavender-100",
                        r.month === month && "ring-1 ring-terracotta-500"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold text-neutral-900">
                          {r.month}
                        </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            r.profitMinor >= 0
                              ? "text-success-600"
                              : "text-danger-600"
                          )}
                        >
                          {formatMinor(r.profitMinor)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        Net {formatMinor(r.netMinor)} · Fees{" "}
                        {formatMinor(r.paystackFeesMinor)} · Expenses{" "}
                        {formatMinor(r.expensesTotalMinor)}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <div className="flex items-center gap-2">
              <Mail aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
              <h2 className="text-base font-bold text-neutral-950">
                Email report
              </h2>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              Send the saved report for {month} to one or more recipients.
            </p>
            <input
              type="email"
              multiple
              value={sendEmails}
              onChange={(e) => setSendEmails(e.target.value)}
              placeholder="email@example.com, another@domain.com"
              aria-label="Recipient emails"
              className={cn(inputClass, "mt-3")}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-ink-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send aria-hidden="true" className="h-4 w-4" />
              {sending ? "Sending..." : "Send report"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ProfitPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-neutral-500">
          Loading profit calculator...
        </div>
      }
    >
      <ProfitCalculator />
    </Suspense>
  );
}
