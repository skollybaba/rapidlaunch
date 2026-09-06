"use client";

import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
        Something went wrong
      </p>
      <h1 className="mt-3 max-w-xl text-[38px] leading-[1.286] md:text-[1.75rem]">
        We couldn&apos;t load this page.
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-500">
        This is usually temporary. Try again in a moment, or contact us and we
        will help directly.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className={buttonStyles({ variant: "primary", size: "md" })}
        >
          Try again
        </button>
        <Link
          href="/contact"
          className={buttonStyles({ variant: "secondary", size: "md" })}
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}