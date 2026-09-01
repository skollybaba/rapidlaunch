"use client";

import { useMemo, useState } from "react";
import { Mail, Send } from "lucide-react";

import { cn } from "@/lib/utils";

const INTENTS = [
  {
    id: "consultation",
    label: "Book a consultation",
    subject: "Consultation request",
    body: "I'd like to book a product strategy consultation.%0D%0A%0D%0AA few lines about my project:",
  },
  {
    id: "mvp",
    label: "MVP build",
    subject: "MVP build inquiry",
    body: "I'd like to explore an MVP sprint.%0D%0A%0D%0AOne sentence about the idea:",
  },
  {
    id: "courses",
    label: "Course access",
    subject: "Question about a course",
    body: "I have a question about a course or my access:",
  },
  {
    id: "support",
    label: "Support",
    subject: "Support request",
    body: "I need help with a purchase, payment, or access:",
  },
] as const;

const SUPPORT_EMAIL = "support@quicklaunch.example";

export function ContactForm() {
  const [intent, setIntent] = useState<(typeof INTENTS)[number]>(INTENTS[0]);

  const mailto = useMemo(
    () =>
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        intent.subject
      )}&body=${encodeURIComponent(intent.body.replace(/%0D%0A/g, "\n"))}`,
    [intent]
  );

  return (
    <form
      className="rounded-md border border-neutral-300 bg-white p-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
        Start a conversation
      </p>
      <h2 className="mt-2 text-[1.375rem] leading-snug">
        What brings you here?
      </h2>
      <fieldset className="mt-5">
        <legend className="sr-only">Choose a contact reason</legend>
        <div className="flex flex-wrap gap-2">
          {INTENTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setIntent(option)}
              aria-pressed={intent.id === option.id}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                intent.id === option.id
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-500 hover:border-ink-700"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 rounded-md border border-neutral-300 bg-neutral-100 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
          <Mail aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
          {SUPPORT_EMAIL}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          We usually reply within two working days. Your message opens in your
          email client with the subject pre-filled — press send and we will
          take it from there.
        </p>
      </div>

      <a
        href={mailto}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-ink-900 px-5 text-sm font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-ink-800"
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        Compose message
      </a>
    </form>
  );
}