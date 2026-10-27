"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { readApiError } from "@/lib/feedback";
import { cn } from "@/lib/utils";

import type {
  PaymentProviderName,
  PaymentProviderSetting,
} from "@/types/payment";

export interface PaymentSettingsState {
  provider: PaymentProviderSetting;
  effectiveProvider: PaymentProviderName;
  fellBack: boolean;
  paystackConfigured: boolean;
  bachsConfigured: boolean;
  displayCurrency?: "NGN" | "USD" | "AUTO" | "LOCATION";
  ngnPerUsd?: number;
}

const OPTIONS: {
  value: PaymentProviderSetting;
  label: string;
  description: string;
}[] = [
  {
    value: "auto",
    label: "Automatic (by location)",
    description:
      "Nigeria pays with Paystack. Other countries pay with Bachs.",
  },
  {
    value: "paystack",
    label: "Paystack",
    description: "Card, bank transfer and USSD for Nigerian customers.",
  },
  {
    value: "bachs",
    label: "Bachs",
    description: "Global card checkout with local currency pricing.",
  },
];

export function PaymentProviderControl({
  initial,
}: {
  initial: PaymentSettingsState;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<PaymentSettingsState>(initial);
  const [pending, setPending] = useState<PaymentProviderSetting | null>(null);

  function isConfigured(provider: PaymentProviderSetting) {
    if (provider === "auto") {
      return state.bachsConfigured || state.paystackConfigured;
    }
    return provider === "bachs" ? state.bachsConfigured : state.paystackConfigured;
  }

  function providerName(provider: PaymentProviderSetting) {
    if (provider === "auto") return "Automatic (by location)";
    return provider === "bachs" ? "Bachs" : "Paystack";
  }

  async function select(provider: PaymentProviderSetting) {
    if (provider === state.provider || pending) return;
    const previous = state;
    setPending(provider);
    setState((current) => ({ ...current, provider }));

    try {
      const response = await fetch("/api/admin/settings/payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: PaymentSettingsState;
        error?: { message?: string };
      };

      if (!response.ok || !body.ok || !body.data) {
        setState(previous);
        toast.error({
          title: readApiError(body, "Could not save the payment provider."),
        });
        return;
      }

      setState(body.data);
      toast.success({ title: `${providerName(provider)} selected` });
      router.refresh();
    } catch {
      setState(previous);
      toast.error({ title: "Could not reach the server." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Payment provider" className="space-y-3">
        {OPTIONS.map((option) => {
          const selected = state.provider === option.value;
          const configured = isConfigured(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending !== null}
              onClick={() => void select(option.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:opacity-60",
                selected
                  ? "border-action bg-action/5"
                  : "border-neutral-300 bg-white hover:border-neutral-400"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-action" : "border-neutral-400"
                )}
              >
                {selected ? (
                  <span className="h-2 w-2 rounded-full bg-action" />
                ) : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-950">
                    {option.label}
                  </span>
                  {option.value === "auto" ? null : configured ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-success-100 px-2 py-0.5 text-xs font-medium text-success-600">
                      <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                      Key set
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-600">
                      <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                      No key
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-neutral-600">
                  {option.description}
                </span>
              </span>

              {pending === option.value ? (
                <Loader2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 animate-spin text-neutral-500"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {state.provider === "bachs" && !state.bachsConfigured ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-800"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Bachs is selected but has no secret key, so checkout will fall back
            to Paystack. Add BACHS_SECRET_KEY to activate Bachs.
          </span>
        </p>
      ) : null}

      {state.provider === "bachs" && state.bachsConfigured ? (
        <p className="text-sm text-neutral-500">
          New checkouts are being created with Bachs, including Nigerian
          visitors. Existing payments still verify against the provider that
          took them.
        </p>
      ) : null}

      {state.provider === "auto" ? (
        <p className="text-sm text-neutral-500">
          {state.paystackConfigured && state.bachsConfigured
            ? "Nigerian visitors use Paystack. Everyone else uses Bachs."
            : !state.paystackConfigured && !state.bachsConfigured
              ? "No gateway keys are set. Add PAYSTACK_SECRET_KEY and/or BACHS_SECRET_KEY."
              : state.bachsConfigured
                ? "Nigerian visitors fall back to Bachs because Paystack has no key. Add PAYSTACK_SECRET_KEY to use Paystack in Nigeria."
                : "Bachs has no secret key, so every visitor uses Paystack. Add BACHS_SECRET_KEY to send international checkouts to Bachs."}
        </p>
      ) : null}
    </div>
  );
}
