"use client";

import { useState } from "react";

import { buttonStyles } from "@/components/ui/button";
import { readApiJson } from "@/lib/http";

type State = "idle" | "loading" | "success" | "error";

export function RescheduleButton({ bookingId }: { bookingId: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function handleClick() {
    if (state === "loading") return;
    setState("loading");
    setError("");
    try {
      const response = await fetch(
        `/api/account/sessions/${bookingId}/reschedule`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const json = await readApiJson(response);
      if (!json?.ok) {
        throw new Error(json?.error?.message ?? "Could not request a reschedule.");
      }
      setState("success");
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error ? err.message : "Could not request a reschedule."
      );
    }
  }

  if (state === "success") {
    return (
      <p role="status" className="mt-3 text-sm font-medium text-success-600">
        Reschedule requested &mdash; we&rsquo;ll confirm the new time shortly.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "loading"}
        className={buttonStyles({ variant: "secondary", size: "md" })}
      >
        {state === "loading" ? "Requesting…" : "Request reschedule"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}