"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, MailCheck, Send } from "lucide-react";

interface TestEmailButtonProps {
  className?: string;
}

export function TestEmailButton({ className }: TestEmailButtonProps) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  async function sendTest() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setResult({
          ok: false,
          message:
            body?.error?.message ??
            "Could not send the test email. Try again shortly.",
        });
        return;
      }
      setResult({
        ok: true,
        message: "Test email sent. Check the configured sender's inbox.",
      });
    } catch {
      setResult({
        ok: false,
        message: "Could not send the test email. Check your connection.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={sendTest}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 rounded-pill border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 focus:outline-none focus:ring-[3px] focus:ring-terracotta-200 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-4" aria-hidden="true" />
        )}
        {pending ? "Sending…" : "Send test email"}
      </button>
      {result ? (
        <span
          className={`inline-flex items-center gap-1 text-xs ${
            result.ok ? "text-success-600" : "text-danger-600"
          }`}
        >
          {result.ok ? (
            <MailCheck className="size-3.5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-3.5" aria-hidden="true" />
          )}
          {result.message}
        </span>
      ) : null}
    </span>
  );
}