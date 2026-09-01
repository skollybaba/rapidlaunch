"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "quicklaunch-cookie-consent";

type ConsentChoice = "accepted" | "necessary";

export function CookieConsent() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "accepted" || stored === "necessary") {
      /* Sync read of client storage on mount; localStorage is not available
         during SSR, so this deliberate one-time read avoids a hydration
         mismatch (banner must not flash for users who already chose). */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChoice(stored);
    }
  }, []);

  if (choice !== null) return null;

  const choose = (value: ConsentChoice) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setChoice(value);
  };

  return (
    <aside
      role="dialog"
      aria-label="Cookie preferences"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto w-full max-w-2xl rounded-md border border-neutral-300 bg-ink-950 p-5 shadow-xl"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <h2 className="text-sm font-semibold text-white">We use cookies</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Necessary cookies keep this site working. Optional cookies help us
            understand how Rapid Launch is used and improve it. Read more in our{" "}
            <Link
              href="/cookies"
              className="font-medium text-lavender-200 underline underline-offset-2 hover:text-white"
            >
              cookie policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Button
            onClick={() => choose("accepted")}
            variant="primary"
            theme="dark"
            size="md"
          >
            Accept all
          </Button>
          <Button
            onClick={() => choose("necessary")}
            variant="secondary"
            theme="dark"
            size="md"
          >
            Necessary only
          </Button>
        </div>
      </div>
    </aside>
  );
}