"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";

const EXPENSE_CATEGORIES = ["ADS", "SALARY", "SERVER", "CUSTOM"] as const;

interface ExpenseInput {
  category: typeof EXPENSE_CATEGORIES[number];
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
  profitMinor: number;
  currency: "NGN";
}

export default function ProfitPage() {
  const searchParams = useSearchParams();

  const [month, setMonth] = useState(searchParams.get("month") || new Date().toISOString().slice(0, 7));
  const [feePercent, setFeePercent] = useState(1.5);
  const [flatFeeMinor, setFlatFeeMinor] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseInput[]>([]);
  const [notes, setNotes] = useState("");
  const [savedReports, setSavedReports] = useState<ProfitCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendEmails, setSendEmails] = useState("");
  const [sendStatus, setSendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const format = (v: number) => formatPrice(v, "NGN");

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/metrics/profit-reports");
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentMonth = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/metrics/profit-reports?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          const calc = data.data;
          setFeePercent(calc.paystackFeePercent);
          setFlatFeeMinor(calc.paystackFlatFeeMinor);
          setExpenses(calc.expenses);
          setNotes(calc.notes || "");
        }
      }
    } catch {}
  }, [month]);

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

  const addExpense = () => {
    setExpenses([...expenses, { category: "ADS", label: "", amountMinor: 0 }]);
  };

  const updateExpense = (index: number, field: keyof ExpenseInput, value: string | number) => {
    const newExpenses = [...expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    setExpenses(newExpenses);
  };

  const removeExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setSendStatus(null);
    try {
      await fetch("/api/admin/metrics/profit-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          paystackFeePercent: feePercent,
          paystackFlatFeeMinor: flatFeeMinor,
          expenses,
          notes,
        }),
      });
      loadReports();
      setSendStatus({ type: "success", message: "Profit report saved" });
    } catch {
      setSendStatus({ type: "error", message: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!sendEmails.trim()) {
      setSendStatus({ type: "error", message: "Enter at least one email" });
      return;
    }
    setSending(true);
    setSendStatus(null);
    try {
      const emails = sendEmails.split(",").map((e) => e.trim()).filter(Boolean);
      await fetch(`/api/admin/metrics/profit-reports/${month}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emails }),
      });
      setSendStatus({ type: "success", message: `Sent to ${emails.length} recipient(s)` });
    } catch {
      setSendStatus({ type: "error", message: "Failed to send email" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-neutral-950">Profit calculator</h1>
        <p className="text-neutral-500 mt-1">
          Calculate monthly profit after Paystack fees and expenses. Save and email reports.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-500">Month & fees</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm text-neutral-600">Month</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="mt-1 w-full rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-600">Paystack fee %</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={feePercent}
                  onChange={(e) => setFeePercent(parseFloat(e.target.value))}
                  className="mt-1 w-full rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-600">Paystack flat fee (minor)</label>
                <input
                  type="number"
                  min="0"
                  value={flatFeeMinor}
                  onChange={(e) => setFlatFeeMinor(parseInt(e.target.value) || 0)}
                  className="mt-1 w-full rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-500">Expenses</h2>
              <button
                type="button"
                onClick={addExpense}
                className="text-sm font-medium text-terracotta-600 hover:underline"
              >
                + Add expense
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {expenses.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">No expenses added yet</p>
              ) : (
                expenses.map((expense, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-[10px] bg-neutral-50">
                    <select
                      value={expense.category}
                      onChange={(e) => updateExpense(idx, "category", e.target.value)}
                      className="w-32 rounded-[8px] border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={expense.label}
                      onChange={(e) => updateExpense(idx, "label", e.target.value)}
                      className="flex-1 rounded-[8px] border border-neutral-300 bg-white px-3 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Amount (minor)"
                      min="0"
                      value={expense.amountMinor}
                      onChange={(e) => updateExpense(idx, "amountMinor", parseInt(e.target.value) || 0)}
                      className="w-36 rounded-[8px] border border-neutral-300 bg-white px-3 py-1.5 text-sm text-right"
                    />
                    <button
                      type="button"
                      onClick={() => removeExpense(idx)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Remove expense"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-500">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this month's report..."
              rows={3}
              className="mt-2 w-full rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-sm"
            />
          </section>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-terracotta-600 px-5 py-2 text-sm font-medium text-white hover:bg-terracotta-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save report"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-500">Saved reports</h2>
            <ul className="mt-4 space-y-2 max-h-96 overflow-auto">
              {loading ? (
                <li className="text-neutral-500 text-center py-4">Loading...</li>
              ) : savedReports.length === 0 ? (
                <li className="text-neutral-500 text-center py-4">No saved reports</li>
              ) : (
                savedReports.map((r) => (
                  <li key={r.month} className="p-3 rounded-[10px] bg-neutral-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-900">{r.month}</span>
                      <span className={`font-semibold ${r.profitMinor >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {format(r.profitMinor)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Revenue: {format(r.netMinor)} · Fees: {format(r.paystackFeesMinor)} · Expenses: {format(r.expensesTotalMinor)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-500">Email report</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Send the current month&apos;s profit report to recipients (comma-separated).
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="email"
                value={sendEmails}
                onChange={(e) => setSendEmails(e.target.value)}
                placeholder="email@example.com, another@domain.com"
                className="flex-1 rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-lavender-600 px-5 py-2 text-sm font-medium text-white hover:bg-lavender-700 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
            {sendStatus && (
              <p className={`mt-2 text-sm ${sendStatus.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                {sendStatus.message}
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-500">Live calculation preview</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Full calculation runs on save. This preview uses saved revenue data when available.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4 text-center">
          <PreviewKpi label="Net revenue" value="—" />
          <PreviewKpi label="Paystack fees" value="—" />
          <PreviewKpi label="Expenses" value={format(expenses.reduce((s, e) => s + e.amountMinor, 0))} />
          <PreviewKpi label="Estimated profit" value="—" />
        </div>
      </section>
    </div>
  );
}

function PreviewKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-[10px] bg-neutral-50">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-neutral-950">{value}</p>
    </div>
  );
}