"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { readApiError } from "@/lib/feedback";
import { readApiJson } from "@/lib/http";
import { toLocalDatetimeInputValue } from "@/lib/utils";
import {
  COUPON_APPLIES_TO,
  COUPON_APPLIES_TO_LABELS,
  type CouponAppliesTo,
} from "@/types/coupon";

const fieldClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

interface CouponFormInitial {
  id?: string;
  code?: string;
  discountPercent?: number;
  appliesTo?: CouponAppliesTo;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number | null;
}

interface CouponFormProps {
  initial?: CouponFormInitial | null;
  basePath?: string;
}

function toIsoOrNull(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function CouponForm({ initial, basePath = "/admin/coupons" }: CouponFormProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const editing = Boolean(initial?.id);

  const [code, setCode] = useState(initial?.code ?? "");
  const [discountPercent, setDiscountPercent] = useState(
    String(initial?.discountPercent ?? "")
  );
  const [appliesTo, setAppliesTo] = useState<CouponAppliesTo>(
    initial?.appliesTo ?? "ALL"
  );
  const [active, setActive] = useState(initial?.active ?? false);
  const [startsAt, setStartsAt] = useState(
    toLocalDatetimeInputValue(initial?.startsAt)
  );
  const [endsAt, setEndsAt] = useState(
    toLocalDatetimeInputValue(initial?.endsAt)
  );
  const [maxUses, setMaxUses] = useState(
    initial?.maxUses != null ? String(initial.maxUses) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");

    const percent = Number(discountPercent);
    let clientError = "";
    if (!code.trim()) clientError = "Enter a code, e.g. LAUNCH50.";
    else if (!Number.isInteger(percent) || percent < 1 || percent > 99) {
      clientError = "Discount must be a whole number between 1 and 99.";
    } else if (
      startsAt &&
      endsAt &&
      new Date(startsAt).getTime() > new Date(endsAt).getTime()
    ) {
      clientError = "End date must be after start date.";
    } else if (
      maxUses.trim() &&
      (!Number.isInteger(Number(maxUses)) || Number(maxUses) < 1)
    ) {
      clientError = "Usage limit must be a whole number of at least 1.";
    }
    if (clientError) {
      setError(clientError);
      toast.error(clientError);
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      discountPercent: percent,
      appliesTo,
      active,
      startsAt: toIsoOrNull(startsAt),
      endsAt: toIsoOrNull(endsAt),
      maxUses: maxUses.trim() ? Number(maxUses) : null,
    };

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/admin/coupons/${initial?.id}` : "/api/admin/coupons",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await readApiJson<{ id: string }>(response);
      if (!json?.ok) {
        throw new Error(readApiError(json, "Could not save the coupon"));
      }
      toast.success({
        title: editing ? "Coupon updated" : "Coupon created",
      });
      router.push(basePath);
      router.refresh();
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Could not save the coupon";
      setError(reason);
      toast.error(reason);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id || saving) return;

    const confirmed = await confirm({
      title: `Delete “${initial.code}”?`,
      description:
        "This permanently removes the coupon. Anything already bought keeps its discount, but the code stops working immediately.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/coupons/${initial.id}`, {
        method: "DELETE",
      });
      const json = await readApiJson(response);
      if (!json?.ok) {
        throw new Error(readApiError(json, "Could not delete the coupon"));
      }
      toast.success({ title: "Coupon deleted" });
      router.push(basePath);
      router.refresh();
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Could not delete the coupon";
      setError(reason);
      toast.error(reason);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-950">Coupon</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="coupon-code" className="text-sm font-medium text-neutral-700">
              Code *
            </label>
            <input
              id="coupon-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH50"
              autoCapitalize="characters"
              className={`${fieldClasses} font-mono uppercase`}
            />
            <p className="mt-2 text-xs text-neutral-500">
              Uppercase letters, numbers, and hyphens. Shown to customers to
              enter at checkout.
            </p>
          </div>
          <div>
            <label htmlFor="coupon-percent" className="text-sm font-medium text-neutral-700">
              Discount *
            </label>
            <div className="relative mt-2">
              <input
                id="coupon-percent"
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="10"
                className={`${fieldClasses} pr-10`}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                %
              </span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Between 1 and 99. We apply it to the product price before you pay.
            </p>
          </div>
          <div>
            <label htmlFor="coupon-applies" className="text-sm font-medium text-neutral-700">
              Applies to
            </label>
            <select
              id="coupon-applies"
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value as CouponAppliesTo)}
              className={fieldClasses}
            >
              {COUPON_APPLIES_TO.map((value) => (
                <option key={value} value={value}>
                  {COUPON_APPLIES_TO_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="coupon-uses" className="text-sm font-medium text-neutral-700">
              Usage limit
            </label>
            <input
              id="coupon-uses"
              type="number"
              min={1}
              inputMode="numeric"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              className={fieldClasses}
            />
            <p className="mt-2 text-xs text-neutral-500">
              Optional. Leave blank for unlimited, or set a cap. Each customer
              can use a code once per order.
            </p>
          </div>
          <div>
            <label htmlFor="coupon-starts" className="text-sm font-medium text-neutral-700">
              Active from
            </label>
            <input
              id="coupon-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={fieldClasses}
            />
            <p className="mt-2 text-xs text-neutral-500">
              Optional. The code only works after this time, in your local time.
            </p>
          </div>
          <div>
            <label htmlFor="coupon-ends" className="text-sm font-medium text-neutral-700">
              Active until
            </label>
            <input
              id="coupon-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={fieldClasses}
            />
            <p className="mt-2 text-xs text-neutral-500">
              Optional. The code stops working after this time, in your local
              time.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[12px] border border-neutral-300 bg-white px-4 py-3">
              <span>
                <span className="block text-sm font-medium text-neutral-950">
                  Turn on now
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  Codes respect the “Active from / until” window even when on.
                </span>
              </span>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-5 w-5 accent-terracotta-600"
              />
            </label>
          </div>
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-pill bg-terracotta-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-terracotta-500 disabled:pointer-events-none disabled:opacity-50"
        >
          {saving ? "Saving…" : editing ? "Save coupon" : "Create coupon"}
        </button>
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className="rounded-pill border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          Cancel
        </button>
        {editing ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving}
            className="ml-auto rounded-pill border border-danger-600 px-6 py-3 text-sm font-semibold text-danger-600 transition-colors hover:bg-danger-100 disabled:pointer-events-none disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}