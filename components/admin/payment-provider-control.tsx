"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { readApiError } from "@/lib/feedback";
import { cn } from "@/lib/utils";

type ProviderName = "paystack" | "bachs";

export interface PaymentSettingsState {
  provider: ProviderName;
  effectiveProvider: ProviderName;
  fellBack: boolean;
  paystackConfigured: boolean;
  bachsConfigured: boolean;
}

const OPTIONS: {
  value: ProviderName;
  label: string;
  description: string;
}[] = [
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
  const [pending, setPending] = useState<ProviderName | null>(null);

  function isConfigured(provider: ProviderName) {
    return provider === "bachs" ? state.bachsConfigured : state.paystackConfigured;
  }

  async function select(provider: ProviderName) {
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
      toast.success({ title: `${provider === "bachs" ? "Bachs" : "Paystack"} selected` });
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
                  {configured ? (
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
          New checkouts are being created with Bachs. Existing payments still
          verify against the provider that took them.
        </p>
      ) : null}
    </div>
  );
}
