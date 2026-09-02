"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useAuth } from "@/components/auth/auth-provider";

function AccountSignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogle, refresh } = useAuth();

  const next =
    typeof searchParams.get("next") === "string"
      ? searchParams.get("next")!
      : "/account";

  function resolveNext() {
    // Only allow internal redirects to avoid open-redirect vulnerabilities.
    try {
      const url = new URL(next, window.location.origin);
      if (url.origin !== window.location.origin) return "/account";
      return url.pathname + url.search;
    } catch {
      return "/account";
    }
  }

  async function afterAuth() {
    await refresh();
    router.push(resolveNext());
    router.refresh();
  }

  async function handleGoogleCredential(credential: string) {
    await loginWithGoogle(credential);
    await afterAuth();
  }

  return (
    <div className="w-full">
      <div className="inline-flex w-full justify-center">
        <GoogleAuthButton
          onCredential={handleGoogleCredential}
          oneTap
          autoSelect
        />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        or continue with email
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <AuthCard
        title="Track everything you've bought"
        subtitle="Sign in or create an account to see your purchases, bookings, and upcoming sessions in one place."
        onSuccess={() => void afterAuth()}
      />
    </div>
  );
}

export function AccountSignIn() {
  return (
    <Suspense fallback={null}>
      <AccountSignInInner />
    </Suspense>
  );
}
