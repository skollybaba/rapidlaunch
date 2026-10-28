import type { Metadata } from "next";

import type { PaymentSettingsState } from "@/components/admin/payment-provider-control";
import { SettingsTabs } from "@/components/admin/settings-tabs";
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
          Manage checkout, currency display, and public site content.
        </p>
      </div>

      <SettingsTabs
        paymentInitial={initial}
        profileInitial={{
          imageUrl: profile.imageUrl,
          imageKey: profile.imageKey,
        }}
      />
    </div>
  );
}
