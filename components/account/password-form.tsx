"use client";

import { useState, type FormEvent } from "react";

import { buttonStyles } from "@/components/ui/button";
import { readApiJson } from "@/lib/http";

const inputClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await readApiJson(response);
      if (!json?.ok) {
        throw new Error(json?.error?.message ?? "Could not change your password");
      }
      setMessage("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
      <h2 className="text-lg font-bold text-neutral-950">Change password</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Use at least 8 characters. If you signed up with Google and have no
        password, use the reset-password flow first.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-5" noValidate>
        <div>
          <label htmlFor="pw-current" className="text-sm font-medium text-neutral-700">
            Current password
          </label>
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="pw-new" className="text-sm font-medium text-neutral-700">
            New password
          </label>
          <input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="pw-confirm" className="text-sm font-medium text-neutral-700">
            Confirm new password
          </label>
          <input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClasses}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="text-sm text-success-600">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className={buttonStyles({ variant: "primary", size: "md" })}
        >
          {saving ? "Saving…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
