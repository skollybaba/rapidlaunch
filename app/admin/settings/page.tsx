import type { Metadata } from "next";

import {
  PaymentProviderControl,
  type PaymentSettingsState,
} from "@/components/admin/payment-provider-control";
import { DisplayCurrencyControl } from "@/components/admin/display-currency-control";
import { requireAdmin } from "@/lib/auth/admin";
import { isProviderConfigured } from "@/lib/providers/payment";
import {
  getDisplaySettings,
  resolvePaymentProvider,
} from "@/lib/services/payment-settings-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings | Rapid Launch Back office",
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  const resolved = await resolvePaymentProvider();
  const display = await getDisplaySettings();
  const initial: PaymentSettingsState = {
    provider: resolved.requested,
    effectiveProvider: resolved.provider,
    fellBack: resolved.fellBack,
    paystackConfigured: isProviderConfigured("paystack"),
    bachsConfigured: isProviderConfigured("bachs"),
    displayCurrency: display.displayCurrency,
    ngnPerUsd: display.ngnPerUsd,
  } as PaymentSettingsState;

  return (
    <div className="admin-enter space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Choose which payment provider takes new checkouts and how prices are
          displayed to visitors.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-300 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Payment provider
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          If the selected provider has no secret key configured, checkout
          automatically falls back to Paystack so sales are never blocked.
        </p>
        <div className="mt-4">
          <PaymentProviderControl initial={initial} />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-300 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Price display currency
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Choose how prices display and which payment provider to use by
          location. Users are charged the Naira equivalent either way.
        </p>
        <div className="mt-4">
          <DisplayCurrencyControl initial={initial} />
        </div>
      </section>
    </div>
  );
}
