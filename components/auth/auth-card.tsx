"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { readApiJson } from "@/lib/http";

type Mode = "login" | "register" | "forgot";

interface AuthCardProps {
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
  showBackHome?: boolean;
}

const inputClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

export function AuthCard({
  title = "Welcome back",
  subtitle = "Sign in to your account or create a new one to track your purchases and sessions.",
  onSuccess,
  showBackHome = true,
}: AuthCardProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        await register({ name: name || undefined, email, password });
      } else if (mode === "login") {
        await login(email, password);
      } else {
        // forgot
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const json = await readApiJson(response);
        if (!json?.ok) {
          throw new Error(json?.error?.message ?? "Could not send reset email");
        }
        setMessage(
          "If an account exists for this email, we've sent a reset link to your inbox."
        );
      }

      if (mode !== "forgot") {
        setMessage(
          mode === "register"
            ? "Your account is ready. You can continue to payment."
            : "You're signed in. You can continue to payment."
        );
        onSuccess?.();
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
  }

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
        {mode === "login"
          ? "Sign in"
          : mode === "register"
            ? "Create account"
            : "Reset password"}
      </p>
      <h1 className="mt-2 text-[1.75rem] leading-[1.286]">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{subtitle}</p>

      <div className="mt-6 flex gap-2 rounded-[12px] bg-neutral-100 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`flex-1 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ${
            mode === "login"
              ? "bg-white text-neutral-950 shadow-sm"
              : "text-neutral-500 hover:text-neutral-950"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`flex-1 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ${
            mode === "register"
              ? "bg-white text-neutral-950 shadow-sm"
              : "text-neutral-500 hover:text-neutral-950"
          }`}
        >
          Create account
        </button>
      </div>

      {mode === "forgot" ? (
        <p className="mt-6 text-sm leading-relaxed text-neutral-500">
          Enter the email you used to create your account and we&apos;ll send you a
          reset link.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {mode === "register" ? (
          <div>
            <label
              htmlFor="auth-name"
              className="text-sm font-semibold text-neutral-950"
            >
              Name{" "}
              <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="auth-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className={inputClasses}
            />
          </div>
        ) : null}

        <div>
          <label
            htmlFor="auth-email"
            className="text-sm font-semibold text-neutral-950"
          >
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={inputClasses}
          />
        </div>

        {mode !== "forgot" ? (
          <div>
            <label
              htmlFor="auth-password"
              className="text-sm font-semibold text-neutral-950"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "register" ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className={inputClasses}
            />
            {mode === "login" ? (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-sm font-medium text-terracotta-600 hover:text-terracotta-500"
                >
                  Forgot password?
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

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
          disabled={submitting}
          className={buttonStyles({
            variant: "primary",
            size: "lg",
            className: "w-full",
          })}
        >
          {submitting
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : "Send reset link"}
        </button>
      </form>

      {showBackHome ? (
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-500 hover:text-neutral-950"
          >
            Back to homepage
          </Link>
        </div>
      ) : null}
    </div>
  );
}
