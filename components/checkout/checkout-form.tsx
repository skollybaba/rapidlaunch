"use client";

import { useState } from "react";

import { buttonStyles } from "@/components/ui/button";

interface CheckoutFormProps {
  productId: string;
  disabled?: boolean;
}

type SubmitState =
  | "idle"
  | "submitting"
  | "redirecting"
  | "error"
  | "unavailable";

export function CheckoutForm({ productId, disabled }: CheckoutFormProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting" || state === "redirecting") return;

    setState("submitting");
    setMessage("");

    try {
      const sessionResponse = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, customerEmail: email }),
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
            "Secure payment is being set up. Your order details are correct — contact us to complete the purchase."
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
        "We couldn't start your checkout. Please try again — no payment has been taken."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
          className="mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]"
        />
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Your payment is verified before access is granted. Google Classroom
          email can be different from this address.
        </p>
      </div>

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