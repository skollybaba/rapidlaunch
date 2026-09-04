"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Mail, X } from "lucide-react";

import {
  BroadcastForm,
  type BroadcastResult,
} from "@/components/admin/broadcast-form";

export function BroadcastModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  function handleSuccess(result: BroadcastResult) {
    window.setTimeout(() => {
      dialogRef.current?.close();
      const params = new URLSearchParams({
        broadcast: "sent",
        sent: String(result.sent),
        total: String(result.recipients),
        failed: String(result.failed),
      });
      router.replace(`/admin/users?${params.toString()}`);
    }, 1400);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-pill bg-terracotta-600 px-5 text-sm font-semibold text-white shadow-sm transition-transform duration-[var(--duration-fast)] hover:bg-terracotta-500 hover:-translate-y-px focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]"
      >
        <Mail className="size-4" aria-hidden="true" />
        Send mail to all users
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Send mail to all users"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-[20px] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">
              Email all users
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Send one message with an optional attachment to every customer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-full p-2 text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-neutral-300"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-5">
          <BroadcastForm onSuccess={handleSuccess} />
        </div>
      </dialog>
    </>
  );
}