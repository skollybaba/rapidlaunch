"use client";

import { useState, type ComponentProps } from "react";
import { CreditCard, Images } from "lucide-react";

import { DisplayCurrencyControl } from "@/components/admin/display-currency-control";
import {
  PaymentProviderControl,
  type PaymentSettingsState,
} from "@/components/admin/payment-provider-control";
import { ProfileImageControl } from "@/components/admin/profile-image-control";
import { cn } from "@/lib/utils";

type ProfileImageControlProps = ComponentProps<typeof ProfileImageControl>;
type TabId = "payment" | "cms";

const TABS: { id: TabId; label: string; icon: typeof CreditCard }[] = [
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "cms", label: "CMS", icon: Images },
];

export function SettingsTabs({
  paymentInitial,
  profileInitial,
}: {
  paymentInitial: PaymentSettingsState;
  profileInitial: {
    imageUrl: ProfileImageControlProps["initialImageUrl"];
    imageKey?: ProfileImageControlProps["initialImageKey"];
  };
}) {
  const [active, setActive] = useState<TabId>("payment");

  return (
    <div>
      <div className="border-b border-neutral-300">
        <div role="tablist" aria-label="Settings sections" className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`settings-panel-${tab.id}`}
                onClick={() => setActive(tab.id)}
                className={cn(
                  "relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors",
                  selected
                    ? "text-terracotta-600"
                    : "text-neutral-500 hover:text-neutral-800"
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {tab.label}
                {selected ? (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-terracotta-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id="settings-panel-payment"
        aria-labelledby="settings-tab-payment"
        hidden={active !== "payment"}
        className="mt-6 space-y-6"
      >
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
            <PaymentProviderControl initial={paymentInitial} />
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
            <DisplayCurrencyControl initial={paymentInitial} />
          </div>
        </section>
      </div>

      <div
        role="tabpanel"
        id="settings-panel-cms"
        aria-labelledby="settings-tab-cms"
        hidden={active !== "cms"}
        className="mt-6 space-y-6"
      >
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
              initialImageUrl={profileInitial.imageUrl}
              initialImageKey={profileInitial.imageKey}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
