import type { Metadata } from "next";

import {
  PaymentProviderControl,
  type PaymentSettingsState,
} from "@/components/admin/payment-provider-control";
import { DisplayCurrencyControl } from "@/components/admin/display-currency-control";
import { ProfileImageControl } from "@/components/admin/profile-image-control";
import { requireAdmin } from "@/lib/auth/admin";
import { isProviderConfigured } from "@/lib/providers/payment";
import {
  getDisplaySettings,
  getSelectedPaymentProvider,
  resolvePaymentProvider,
} from "@/lib/services/payment-settings-service";
import { getProfileSettings } from "@/lib/services/profile-settings-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings | Agile Minds Hub Back office",
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  const resolved = await resolvePaymentProvider();
  const selectedProvider = await getSelectedPaymentProvider();
  const display = await getDisplaySettings();
  const profile = await getProfileSettings();
  const initial: PaymentSettingsState = {
    provider: selectedProvider,
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
          &ldquo;Automatic&rdquo; picks the provider per visitor (Paystack in
          Nigeria, Bachs elsewhere). Choosing Paystack or Bachs explicitly uses
          that gateway for every checkout. If the chosen provider has no secret
          key, checkout falls back to Paystack so sales are never blocked.
        </p>
        <div className="mt-4">
          <PaymentProviderControl initial={initial} />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-300 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          About page profile photo
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Upload the portrait shown on the public About page. Changes apply as
          soon as you save.
        </p>
        <div className="mt-4">
          <ProfileImageControl
            initialImageUrl={profile.imageUrl}
            initialImageKey={profile.imageKey}
          />
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
