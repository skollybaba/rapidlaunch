"use client";

import { useState, type FormEvent } from "react";

import { buttonStyles } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { readApiJson } from "@/lib/http";

const inputClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await readApiJson<{ user?: { name?: string } }>(response);
      if (!json?.ok) {
        throw new Error(json?.error?.message ?? "Could not update your profile");
      }
      setMessage("Profile updated.");
      if (setUser && user) {
        setUser({ ...user, name: json.data?.user?.name ?? name });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
      <h2 className="text-lg font-bold text-neutral-950">Profile details</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Update the name shown across the site.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-5" noValidate>
        <div>
          <label htmlFor="profile-name" className="text-sm font-medium text-neutral-700">
            Full name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="profile-email" className="text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            disabled
            className={`${inputClasses} cursor-not-allowed bg-neutral-100 text-neutral-400`}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Your email is used to sign in and cannot be changed here.
          </p>
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
          disabled={saving || name.trim() === initialName}
          className={buttonStyles({ variant: "primary", size: "md" })}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}
