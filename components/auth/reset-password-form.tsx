"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

const inputClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setMessage("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Could not reset password");
      }
      setMessage(
        "Your password was reset. You can now sign in with your new password."
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
        Reset password
      </p>
      <h1 className="mt-2 text-[1.75rem] leading-[1.286]">Choose a new password</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        Enter a new password for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <div>
          <label
            htmlFor="reset-password"
            className="text-sm font-semibold text-neutral-950"
          >
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className={inputClasses}
          />
        </div>

        <div>
          <label
            htmlFor="reset-confirm"
            className="text-sm font-semibold text-neutral-950"
          >
            Confirm password
          </label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Repeat your password"
            className={inputClasses}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]"
          >
            {error}
          </p>
        ) : null}

        {message ? (
          <p
            role="status"
            className="rounded-[12px] border border-[#C7D2FE] bg-[#EEF2FF] px-4 py-3 text-sm text-[#4338CA]"
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !token}
          className={buttonStyles({
            variant: "primary",
            size: "lg",
            className: "w-full",
          })}
        >
          {submitting ? "Resetting…" : "Reset password"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/account"
          className="text-sm font-medium text-terracotta-600 hover:text-terracotta-500"
        >
          Sign in now
        </Link>
      </div>
    </div>
  );
}
