"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import {
  Coins,
  CreditCard,
  Images,
  Image as ImageIcon,
} from "lucide-react";

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

type ChipTone = "success" | "warning" | "info" | "neutral";

const CHIP_TONES: Record<ChipTone, string> = {
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
  info: "bg-lavender-100 text-ink-700",
  neutral: "bg-neutral-100 text-neutral-700",
};

const DOT_TONES: Record<ChipTone, string> = {
  success: "bg-success-600",
  warning: "bg-warning-600",
  info: "bg-terracotta-500",
  neutral: "bg-neutral-300",
};

function StatusChip({
  tone,
  children,
}: {
  tone: ChipTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        CHIP_TONES[tone]
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DOT_TONES[tone])} />
      {children}
    </span>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  badge,
  children,
}: {
  icon: typeof CreditCard;
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="group overflow-hidden rounded-[16px] border border-neutral-300 bg-white transition-shadow duration-[var(--duration-standard)] hover:shadow-[0_8px_24px_rgb(17_18_29_/_6%)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-600 transition-transform duration-[var(--duration-fast)] group-hover:scale-110"
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
            <p className="mt-1 max-w-[68ch] text-sm leading-6 text-neutral-500">
              {description}
            </p>
          </div>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function providerLabel(provider: string) {
  if (provider === "auto") return "Automatic (by location)";
  return provider === "bachs" ? "Bachs" : "Paystack";
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: ChipTone;
}) {
  return (
    <div className="rounded-[12px] border border-neutral-300 bg-white px-4 py-3.5">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-neutral-950">
        <span
          aria-hidden="true"
          className={cn("h-2 w-2 shrink-0 rounded-full", DOT_TONES[tone])}
        />
        {value}
      </p>
    </div>
  );
}

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
    <div className="space-y-8">
      <div
        role="tablist"
        aria-label="Settings sections"
        className="inline-flex max-w-full gap-1 rounded-[14px] border border-neutral-300 bg-lavender-100 p-1"
      >
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
                "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-all duration-[var(--duration-fast)] sm:flex-none",
                selected
                  ? "bg-white text-terracotta-600 shadow-sm"
                  : "text-neutral-500 hover:bg-white/60 hover:text-neutral-950"
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 transition-transform duration-[var(--duration-fast)]",
                  selected && "scale-110"
                )}
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      {active === "payment" ? (
        <div
          key="payment"
          role="tabpanel"
          id="settings-panel-payment"
          aria-labelledby="settings-tab-payment"
          className="animate-fade-in space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <StatusTile
              label="Checkout provider"
              value={providerLabel(paymentInitial.provider)}
              tone={paymentInitial.fellBack ? "warning" : "success"}
            />
            <StatusTile
              label="Price display"
              value={`Show ${paymentInitial.displayCurrency}`}
              tone="info"
            />
            <StatusTile
              label="Naira rate"
              value={`₦${paymentInitial.ngnPerUsd} / $1`}
              tone="neutral"
            />
          </div>

          <SettingsSection
            icon={CreditCard}
            title="Payment provider"
            badge={
              <StatusChip tone={paymentInitial.fellBack ? "warning" : "success"}>
                {paymentInitial.fellBack
                  ? "Falling back to Paystack"
                  : "Keys configured"}
              </StatusChip>
            }
            description="“Automatic” picks the provider per visitor (Paystack in Nigeria, Bachs elsewhere). Choosing Paystack or Bachs explicitly uses that gateway for every checkout. If the chosen provider has no secret key, checkout falls back to Paystack so sales are never blocked."
          >
            <PaymentProviderControl initial={paymentInitial} />
          </SettingsSection>

          <SettingsSection
            icon={Coins}
            title="Price display currency"
            badge={
              <StatusChip tone="info">
                Displaying {paymentInitial.displayCurrency}
              </StatusChip>
            }
            description="Choose how prices display and which payment provider to use by location. Users are charged the Naira equivalent either way."
          >
            <DisplayCurrencyControl initial={paymentInitial} />
          </SettingsSection>
        </div>
      ) : (
        <div
          key="cms"
          role="tabpanel"
          id="settings-panel-cms"
          aria-labelledby="settings-tab-cms"
          className="animate-fade-in space-y-6"
        >
          <SettingsSection
            icon={ImageIcon}
            title="About page profile photo"
            badge={
              profileInitial.imageUrl ? (
                <StatusChip tone="success">Photo set</StatusChip>
              ) : (
                <StatusChip tone="neutral">No photo yet</StatusChip>
              )
            }
            description="Upload the portrait shown on the public About page. Changes apply as soon as you save."
          >
            <ProfileImageControl
              initialImageUrl={profileInitial.imageUrl}
              initialImageKey={profileInitial.imageKey}
            />
          </SettingsSection>
        </div>
      )}
    </div>
  );
}
