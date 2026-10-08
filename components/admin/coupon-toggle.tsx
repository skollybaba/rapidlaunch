"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { isApiFailure, readApiError } from "@/lib/feedback";
import { readApiJson } from "@/lib/http";

interface CouponToggleProps {
  id: string;
  active: boolean;
  code: string;
  disabled?: boolean;
}

export function CouponToggle({
  id,
  active,
  code,
  disabled = false,
}: CouponToggleProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending || disabled) return;
    setPending(true);
    try {
      const next = !active;
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const json = await readApiJson(response);
      if (!json?.ok || isApiFailure(json)) {
        throw new Error(readApiError(json, "Could not update the coupon"));
      }
      toast.success({
        title: next
          ? `${code} is now on.`
          : `${code} is now off.`,
      });
      router.refresh();
    } catch {
      toast.error("Could not update the coupon. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending || disabled}
      role="switch"
      aria-checked={active}
      aria-label={`${code} is ${active ? "on" : "off"}. Click to turn ${active ? "off" : "on"}.`}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none disabled:opacity-50 ${
        active ? "bg-success-600" : "bg-neutral-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-[var(--duration-fast)] ${
          active ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}