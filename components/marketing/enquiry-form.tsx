"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";

export type EnquiryMode = "interest" | "quote";

interface EnquiryFormProps {
  mode: EnquiryMode;
  productSlug: string;
  productTitle: string;
  /** Minor-unit amount, present when the engagement has a listed price. */
  listedPriceMinor?: number | undefined;
  currency?: string;
  submitLabel: string;
}

interface SuccessState {
  reference: string;
  requiresQuote: boolean;
  quotedPriceMinor?: number | undefined;
  currency: string;
}

const INPUT =
  "mt-1.5 w-full rounded-sm border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-neutral-400 focus:border-action focus:ring-2 focus:ring-action/20";

const LABEL = "block text-sm font-semibold text-neutral-800";

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | undefined;
  children: (props: { id: string; describedBy: string | undefined }) => React.ReactElement;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        {label}
        {required ? <span className="text-action"> *</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs leading-relaxed text-neutral-500">
          {hint}
        </p>
      ) : null}
      {children({ id, describedBy })}
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function EnquiryForm({
  mode,
  productSlug,
  productTitle,
  listedPriceMinor,
  currency = "NGN",
  submitLabel,
}: EnquiryFormProps) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload: Record<string, unknown> = { mode, productSlug };

    for (const [key, value] of data.entries()) {
      const text = String(value).trim();
      if (text) payload[key] = text;
    }

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: SuccessState;
        error?: { message?: string; code?: string };
      };

      if (!response.ok || !body.ok || !body.data) {
        const message = body.error?.message ?? "We could not send that. Please try again.";
        setFormError(message);
        return;
      }

      setSuccess(body.data);
      form.reset();
    } catch {
      setFormError(
        "We could not reach the server. Check your connection and try again."
      );
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-action"
          />
          <div>
            <h3 className="text-base font-semibold text-neutral-950">
              Received. We will be in touch.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Your enquiry for{" "}
              <span className="font-semibold">{productTitle}</span> is with
              our team. We reply to enquiries within two working days.
            </p>
            {success.requiresQuote ? (
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Because this engagement is scoped per project, we will send you a
                quote with the scope, timeline and price before anything is
                payable.
              </p>
            ) : success.quotedPriceMinor ? (
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Once we confirm the scope with you, payment of{" "}
                {formatPrice(success.quotedPriceMinor, success.currency)}{" "}
                unlocks the build.
              </p>
            ) : null}
            <p className="mt-3 text-xs text-neutral-500">
              Reference {success.reference.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-neutral-300 bg-white p-6"
      noValidate
    >
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
        {mode === "quote" ? "Request a quote" : "Start with your idea"}
      </p>
      <h2 className="mt-2 text-[1.375rem] leading-snug text-neutral-950">
        {mode === "quote" ? productTitle : productTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        {mode === "quote"
          ? "No payment is taken now. Tell us what you are building and we will come back with a quote, a realistic timeline, and everything you need to decide."
          : "Tell us what you are building. We confirm the scope with you first, then send a payment link."}
      </p>

      {listedPriceMinor ? (
        <p className="mt-4 rounded-sm border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
          Listed price{" "}
          <span className="font-semibold">
            {formatPrice(listedPriceMinor, currency)}
          </span>
          . You pay only after we confirm the scope together.
        </p>
      ) : null}

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}>
            {({ id, describedBy }) => (
              <input
                id={id}
                name="name"
                type="text"
                required
                autoComplete="name"
                aria-describedby={describedBy}
                aria-invalid={Boolean(errors.name)}
                className={INPUT}
              />
            )}
          </Field>
          <Field label="Email" required error={errors.email}>
            {({ id, describedBy }) => (
              <input
                id={id}
                name="email"
                type="email"
                required
                autoComplete="email"
                aria-describedby={describedBy}
                aria-invalid={Boolean(errors.email)}
                className={INPUT}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Company" error={errors.company}>
            {({ id, describedBy }) => (
              <input
                id={id}
                name="company"
                type="text"
                autoComplete="organization"
                aria-describedby={describedBy}
                className={INPUT}
              />
            )}
          </Field>
          <Field label="Phone" error={errors.phone}>
            {({ id, describedBy }) => (
              <input
                id={id}
                name="phone"
                type="tel"
                autoComplete="tel"
                aria-describedby={describedBy}
                className={INPUT}
              />
            )}
          </Field>
        </div>

        {mode === "quote" ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Website or product link" error={errors.website}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="website"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  aria-describedby={describedBy}
                  className={INPUT}
                />
              )}
            </Field>
            <Field label="Team size" error={errors.teamSize}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="teamSize"
                  type="text"
                  placeholder="e.g. just me, 3 engineers"
                  aria-describedby={describedBy}
                  className={INPUT}
                />
              )}
            </Field>
          </div>
        ) : (
          <Field label="Where are you now?" error={errors.currentStage}>
            {({ id, describedBy }) => (
              <input
                id={id}
                name="currentStage"
                type="text"
                placeholder="Idea, prototype, or already in production"
                aria-describedby={describedBy}
                className={INPUT}
              />
            )}
          </Field>
        )}

        <Field
          label="What are you building?"
          required
          hint="A few sentences is plenty. The more concrete the better."
          error={errors.whatYouAreBuilding}
        >
          {({ id, describedBy }) => (
            <textarea
              id={id}
              name="whatYouAreBuilding"
              required
              rows={4}
              aria-describedby={describedBy}
              aria-invalid={Boolean(errors.whatYouAreBuilding)}
              className={cn(INPUT, "resize-y")}
            />
          )}
        </Field>

        <Field
          label={mode === "quote" ? "What does the project involve?" : "What help do you need?"}
          required
          error={errors[mode === "quote" ? "projectScope" : "helpNeeded"]}
        >
          {({ id, describedBy }) => (
            <textarea
              id={id}
              name={mode === "quote" ? "projectScope" : "helpNeeded"}
              required
              rows={3}
              aria-describedby={describedBy}
              className={cn(INPUT, "resize-y")}
            />
          )}
        </Field>

        {mode === "quote" ? (
          <Field
            label="Anything else we should know?"
            error={errors.requirements}
          >
            {({ id, describedBy }) => (
              <textarea
                id={id}
                name="requirements"
                rows={3}
                aria-describedby={describedBy}
                className={cn(INPUT, "resize-y")}
              />
            )}
          </Field>
        ) : null}

        <Field label="Timeline" error={errors.timeline}>
          {({ id, describedBy }) => (
            <input
              id={id}
              name="timeline"
              type="text"
              placeholder="e.g. want to launch in 3 months"
              aria-describedby={describedBy}
              className={INPUT}
            />
          )}
        </Field>

        {mode === "quote" ? (
          <Field
            label="Budget range (optional)"
            hint="A range helps us propose something realistic."
            error={errors.budgetMinor}
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                name="budgetMinor"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="e.g. 25000000"
                aria-describedby={describedBy}
                className={INPUT}
              />
            )}
          </Field>
        ) : null}
      </div>

      {formError ? (
        <p
          role="alert"
          className="mt-5 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={buttonStyles({
          variant: "primary",
          size: "lg",
          className: "mt-6 w-full",
        })}
      >
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Sending
          </>
        ) : (
          <>
            <Send aria-hidden="true" className="h-4 w-4" />
            {submitLabel}
          </>
        )}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        We use your details only to respond to this enquiry.
      </p>
    </form>
  );
}