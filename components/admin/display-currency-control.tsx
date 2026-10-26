"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin } from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { readApiError } from "@/lib/feedback";
import { cn } from "@/lib/utils";

function NigeriaFlag() {
  return (
    <svg
      width="18"
      height="12"
      viewBox="0 0 18 12"
      aria-hidden="true"
      className="rounded-[1px]"
    >
      <rect width="6" height="12" fill="#008751" />
      <rect x="6" width="6" height="12" fill="#FFFFFF" />
      <rect x="12" width="6" height="12" fill="#008751" />
    </svg>
  );
}

function UsaFlag() {
  return (
    <svg
      width="18"
      height="12"
      viewBox="0 0 18 12"
      aria-hidden="true"
      className="rounded-[1px]"
    >
      <rect width="18" height="12" fill="#B22234" />
      <g fill="#FFFFFF">
        <rect y="0.923" width="18" height="0.923" />
        <rect y="2.769" width="18" height="0.923" />
        <rect y="4.615" width="18" height="0.923" />
        <rect y="6.462" width="18" height="0.923" />
        <rect y="8.308" width="18" height="0.923" />
        <rect y="10.154" width="18" height="0.923" />
      </g>
      <rect width="7.2" height="6.462" fill="#3C3B6E" />
      <g fill="#FFFFFF">
        <circle cx="1.2" cy="1.077" r="0.277" />
        <circle cx="2.4" cy="1.077" r="0.277" />
        <circle cx="3.6" cy="1.077" r="0.277" />
        <circle cx="4.8" cy="1.077" r="0.277" />
        <circle cx="6" cy="1.077" r="0.277" />
        <circle cx="1.8" cy="2.154" r="0.277" />
        <circle cx="3" cy="2.154" r="0.277" />
        <circle cx="4.2" cy="2.154" r="0.277" />
        <circle cx="5.4" cy="2.154" r="0.277" />
        <circle cx="1.2" cy="3.231" r="0.277" />
        <circle cx="2.4" cy="3.231" r="0.277" />
        <circle cx="3.6" cy="3.231" r="0.277" />
        <circle cx="4.8" cy="3.231" r="0.277" />
        <circle cx="6" cy="3.231" r="0.277" />
        <circle cx="1.8" cy="4.308" r="0.277" />
        <circle cx="3" cy="4.308" r="0.277" />
        <circle cx="4.2" cy="4.308" r="0.277" />
        <circle cx="5.4" cy="4.308" r="0.277" />
        <circle cx="1.2" cy="5.385" r="0.277" />
        <circle cx="2.4" cy="5.385" r="0.277" />
        <circle cx="3.6" cy="5.385" r="0.277" />
        <circle cx="4.8" cy="5.385" r="0.277" />
        <circle cx="6" cy="5.385" r="0.277" />
      </g>
    </svg>
  );
}

export function DisplayCurrencyControl({
  initial,
}: {
  initial: {
    displayCurrency?: "NGN" | "USD" | "AUTO" | "LOCATION";
    ngnPerUsd?: number;
    usdPerNaira?: number;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [displayCurrency, setDisplayCurrency] = useState<
    "NGN" | "USD" | "LOCATION"
  >(
    initial.displayCurrency === "USD"
      ? "USD"
      : initial.displayCurrency === "NGN"
        ? "NGN"
        : "LOCATION"
  );
  const [usdPerNaira, setUsdPerNaira] = useState<number>(
    initial.usdPerNaira ?? (initial.ngnPerUsd ? 1 / initial.ngnPerUsd : 0.000625)
  );
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/settings/payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCurrency, usdPerNaira }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: unknown;
        error?: { message?: string };
      };

      if (!response.ok || !body.ok) {
        toast.error({
          title: readApiError(body, "Could not save settings."),
        });
        return;
      }

      toast.success({ title: "Currency settings updated" });
      router.refresh();
    } catch {
      toast.error({ title: "Could not reach the server." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Display currency" className="space-y-2">
        <button
          type="button"
          role="radio"
          aria-checked={displayCurrency === "NGN"}
          onClick={() => setDisplayCurrency("NGN")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
            displayCurrency === "NGN"
              ? "border-action bg-action/5"
              : "border-neutral-300 bg-white hover:border-neutral-400"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
              displayCurrency === "NGN" ? "border-action" : "border-neutral-400"
            )}
          >
            {displayCurrency === "NGN" ? (
              <span className="h-2 w-2 rounded-full bg-action" />
            ) : null}
          </span>
          <NigeriaFlag />
          <div className="flex-1">
            <p className="text-sm font-semibold text-neutral-950">Nigerian Naira (₦)</p>
            <p className="text-sm text-neutral-600">Always show prices in Naira</p>
          </div>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={displayCurrency === "USD"}
          onClick={() => setDisplayCurrency("USD")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
            displayCurrency === "USD"
              ? "border-action bg-action/5"
              : "border-neutral-300 bg-white hover:border-neutral-400"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
              displayCurrency === "USD" ? "border-action" : "border-neutral-400"
            )}
          >
            {displayCurrency === "USD" ? (
              <span className="h-2 w-2 rounded-full bg-action" />
            ) : null}
          </span>
          <UsaFlag />
          <div className="flex-1">
            <p className="text-sm font-semibold text-neutral-950">US Dollar ($)</p>
            <p className="text-sm text-neutral-600">Always show prices in USD</p>
          </div>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={displayCurrency === "LOCATION"}
          onClick={() => setDisplayCurrency("LOCATION")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
            displayCurrency === "LOCATION"
              ? "border-action bg-action/5"
              : "border-neutral-300 bg-white hover:border-neutral-400"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
              displayCurrency === "LOCATION" ? "border-action" : "border-neutral-400"
            )}
          >
            {displayCurrency === "LOCATION" ? (
              <span className="h-2 w-2 rounded-full bg-action" />
            ) : null}
          </span>
          <MapPin className="h-4 w-4 text-neutral-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-neutral-950">By user location</p>
            <p className="text-sm text-neutral-600">
              Nigeria → Naira (Paystack). Others → USD (Bachs) & prices shown in USD
            </p>
          </div>
        </button>
      </div>

      <div className="rounded-xl border border-neutral-300 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-950">Exchange rate</p>
        <p className="mt-1 text-sm text-neutral-500">
          1 Naira = X USD. Used for USD pricing. In location mode, visitors
          outside Nigeria are charged in USD via Bachs; everyone else is charged
          in Naira.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2">
            <span className="text-sm text-neutral-600">1 Naira =</span>
            <input
              type="number"
              min="0.000001"
              step="0.000001"
              value={usdPerNaira}
              onChange={(e) => setUsdPerNaira(Number(e.target.value))}
              className="w-28 bg-transparent text-sm text-neutral-950 outline-none"
            />
            <span className="text-sm text-neutral-600">USD</span>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-terracotta-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta-500 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
