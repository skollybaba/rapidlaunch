"use client";

import { useRouter } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useAuth } from "@/components/auth/auth-provider";

interface AccountSignInProps {
  next?: string;
}

export function AccountSignIn({ next }: AccountSignInProps) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();

  function resolveNext() {
    if (!next) return "/account/overview";
    if (!next.startsWith("/") || next.startsWith("//")) return "/account/overview";
    return next;
  }

  async function afterAuth() {
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
        <GoogleAuthButton onCredential={handleGoogleCredential} />
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
