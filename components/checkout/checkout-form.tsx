"use client";

import { useEffect, useMemo, useState } from "react";

import { buttonStyles } from "@/components/ui/button";

interface CheckoutFormProps {
  productId: string;
  isSession?: boolean;
  sessionDurationMinutes?: number;
  disabled?: boolean;
}

type SubmitState =
  | "idle"
  | "submitting"
  | "redirecting"
  | "error"
  | "unavailable";

type SlotStatus = "idle" | "loading" | "ready" | "empty" | "unavailable";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

function formatSlot(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function CheckoutForm({
  productId,
  isSession = false,
  sessionDurationMinutes,
  disabled,
}: CheckoutFormProps) {
  const [email, setEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [whatYouAreBuilding, setWhatYouAreBuilding] = useState("");
  const [currentStage, setCurrentStage] = useState("");
  const [helpNeeded, setHelpNeeded] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slotStatus, setSlotStatus] = useState<SlotStatus>(
    isSession ? "loading" : "idle"
  );
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isSession) return;
    let cancelled = false;

    async function load() {
      const duration = sessionDurationMinutes ?? 90;
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos";
      try {
        const response = await fetch(
          `/api/calendar/availability?durationMinutes=${duration}&timezone=${encodeURIComponent(timezone)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );
        const json = await response.json();
        if (cancelled) return;
        if (!json.ok) {
          setSlotStatus("unavailable");
          return;
        }
        const data = json.data as { slots: TimeSlot[] };
        if (!data.slots?.length) {
          setSlotStatus("empty");
          return;
        }
        setSlots(data.slots);
        setSlotStatus("ready");
      } catch {
        if (!cancelled) setSlotStatus("unavailable");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isSession, sessionDurationMinutes]);

  const groupedSlots = useMemo(() => {
    const groups = new Map<string, TimeSlot[]>();
    for (const slot of slots) {
      const key = new Date(slot.startTime).toDateString();
      const list = groups.get(key) ?? [];
      list.push(slot);
      groups.set(key, list);
    }
    return Array.from(groups.entries())
      .map(([key, list]) => ({
        date: new Date(key),
        slots: list.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [slots]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting" || state === "redirecting") return;

    setState("submitting");
    setMessage("");

    try {
      const sessionResponse = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          customerEmail: email,
          ...(isSession
            ? {
                session: {
                  customerName,
                  whatYouAreBuilding:
                    whatYouAreBuilding.trim() || undefined,
                  currentStage: currentStage || undefined,
                  helpNeeded: helpNeeded.trim() || undefined,
                  timezone:
                    Intl.DateTimeFormat().resolvedOptions().timeZone ||
                    "Africa/Lagos",
                  requestedStartTime: selectedSlot || undefined,
                },
              }
            : {}),
        }),
      });
      const sessionJson = await sessionResponse.json();

      if (!sessionJson.ok) {
        throw new Error(sessionJson.error?.code ?? "CHECKOUT_FAILED");
      }

      const orderReference = sessionJson.data.orderReference as string;

      const initResponse = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderReference }),
      });
      const initJson = await initResponse.json();

      if (!initJson.ok) {
        const code = initJson.error?.code as string;
        if (code === "PAYSTACK_NOT_CONFIGURED") {
          setState("unavailable");
          setMessage(
            "Secure payment is being set up. Your order details are correct. Contact us to complete the purchase."
          );
          return;
        }
        throw new Error(code ?? "PAYMENT_INIT_FAILED");
      }

      const authorizationUrl = initJson.data.authorizationUrl as string;
      setState("redirecting");
      window.location.href = authorizationUrl;
    } catch {
      setState("error");
      setMessage(
        "We couldn't start your checkout. Please try again. No payment has been taken."
      );
    }
  }

  const inputClasses =
    "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {isSession ? (
        <div>
          <label
            htmlFor="checkout-name"
            className="text-sm font-semibold text-neutral-950"
          >
            Full name
          </label>
          <input
            id="checkout-name"
            name="customerName"
            type="text"
            autoComplete="name"
            required
            disabled={disabled || state === "submitting" || state === "redirecting"}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Your name"
            className={inputClasses}
          />
        </div>
      ) : null}

      <div>
        <label
          htmlFor="checkout-email"
          className="text-sm font-semibold text-neutral-950"
        >
          Email for this purchase
        </label>
        <input
          id="checkout-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={disabled || state === "submitting" || state === "redirecting"}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={inputClasses}
        />
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {isSession
            ? "We send your receipt and the booking confirmation here."
            : "Your payment is verified before access is granted. Google Classroom email can be different from this address."}
        </p>
      </div>

      {isSession ? (
        <>
          <div>
            <label
              htmlFor="checkout-building"
              className="text-sm font-semibold text-neutral-950"
            >
              What are you building?
            </label>
            <input
              id="checkout-building"
              name="whatYouAreBuilding"
              type="text"
              disabled={disabled || state === "submitting" || state === "redirecting"}
              value={whatYouAreBuilding}
              onChange={(event) => setWhatYouAreBuilding(event.target.value)}
              placeholder="A short description of your product"
              className={inputClasses}
            />
          </div>

          <div>
            <label
              htmlFor="checkout-stage"
              className="text-sm font-semibold text-neutral-950"
            >
              Where are you today?
            </label>
            <select
              id="checkout-stage"
              name="currentStage"
              disabled={disabled || state === "submitting" || state === "redirecting"}
              value={currentStage}
              onChange={(event) => setCurrentStage(event.target.value)}
              className={inputClasses}
            >
              <option value="">Select a stage</option>
              <option value="Idea">Just an idea</option>
              <option value="Prototype">Working prototype</option>
              <option value="Building">Actively building</option>
              <option value="Live">Live product</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="checkout-help"
              className="text-sm font-semibold text-neutral-950"
            >
              What do you need help with?
            </label>
            <textarea
              id="checkout-help"
              name="helpNeeded"
              rows={3}
              disabled={disabled || state === "submitting" || state === "redirecting"}
              value={helpNeeded}
              onChange={(event) => setHelpNeeded(event.target.value)}
              placeholder="The main thing you want to get clarity on"
              className={inputClasses}
            />
          </div>

          <div>
            <span className="text-sm font-semibold text-neutral-950">
              Pick a time for your session
            </span>
            {slotStatus === "loading" ? (
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                Loading available times…
              </p>
            ) : slotStatus === "unavailable" ? (
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                Times are being set up. You can complete the purchase and pick
                your slot after payment.
              </p>
            ) : slotStatus === "empty" ? (
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                No times are available in the next few weeks. Complete the
                purchase and we will arrange a time with you.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {sessionDurationMinutes
                    ? `Each session is ${sessionDurationMinutes} minutes. Select the slot that suits you.`
                    : "Select the slot that suits you."}
                </p>
                <div className="mt-3 space-y-4">
                  {groupedSlots.map((group) => (
                    <div key={group.date.toISOString()}>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
                        {new Intl.DateTimeFormat("en-GB", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        }).format(group.date)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Available times">
                        {group.slots.map((slot) => {
                          const isSelected = selectedSlot === slot.startTime;
                          return (
                            <button
                              key={slot.startTime}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              disabled={
                                disabled ||
                                state === "submitting" ||
                                state === "redirecting"
                              }
                              onClick={() => setSelectedSlot(slot.startTime)}
                              className={
                                isSelected
                                  ? "rounded-pill border border-terracotta-600 bg-terracotta-600 px-3.5 py-2 font-sans text-xs font-semibold text-white transition-colors duration-[var(--duration-fast)]"
                                  : "rounded-pill border border-neutral-300 bg-white px-3.5 py-2 font-sans text-xs font-semibold text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:border-terracotta-600 hover:text-terracotta-600"
                              }
                            >
                              {formatSlot(new Date(slot.startTime))}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      ) : null}

      <button
        type="submit"
        disabled={
          disabled || state === "submitting" || state === "redirecting"
        }
        className={buttonStyles({
          variant: "primary",
          size: "lg",
          className: "w-full",
        })}
      >
        {state === "submitting"
          ? "Preparing your order…"
          : state === "redirecting"
            ? "Redirecting to Paystack…"
            : isSession
              ? "Book my session"
              : "Pay securely with Paystack"}
      </button>

      <p className="text-xs leading-relaxed text-neutral-500">
        By continuing you agree to our{" "}
        <a href="/refund-policy" className="text-terracotta-600 underline">
          refund policy
        </a>{" "}
        and{" "}
        <a href="/terms" className="text-terracotta-600 underline">
          terms
        </a>
        . You will be redirected to Paystack to complete payment securely.
      </p>

      {state !== "idle" ? (
        <p
          role="status"
          className={
            state === "error" || state === "unavailable"
              ? "rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]"
              : "rounded-[12px] border border-[#C7D2FE] bg-[#EEF2FF] px-4 py-3 text-sm text-[#4338CA]"
          }
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}