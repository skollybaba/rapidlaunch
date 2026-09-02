"use client";

export function PaymentLoader({ step }: { step?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-paper-50 px-6">
      <div className="relative">
        {/* Outer ring */}
        <div className="h-20 w-20 animate-spin rounded-full border-[4px] border-neutral-200 border-t-terracotta-600" />
        {/* Inner pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full bg-terracotta-600/20" />
        </div>
      </div>
      <p className="mt-6 text-[1.375rem] font-bold text-neutral-950">
        {step || "Verifying your payment…"}
      </p>
      <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-neutral-500">
        We&apos;re checking with Paystack. This usually takes a few seconds &mdash; no
        need to close this page.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <span className="inline-flex h-2 w-2 rounded-full bg-terracotta-600 animate-bounce" />
        <span className="inline-flex h-2 w-2 rounded-full bg-terracotta-600/70 animate-bounce [animation-delay:150ms]" />
        <span className="inline-flex h-2 w-2 rounded-full bg-terracotta-600/40 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
