import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
        Page not found
      </p>
      <h1 className="mt-3 text-[38px] leading-[1.08] md:text-[3.25rem]">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-500">
        The link may have changed or the page may no longer be available. Head
        back to the homepage to keep exploring.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className={buttonStyles({ variant: "primary", size: "md" })}
        >
          Back to homepage
        </Link>
        <Link
          href="/courses"
          className={buttonStyles({ variant: "secondary", size: "md" })}
        >
          Browse courses
        </Link>
      </div>
    </div>
  );
}