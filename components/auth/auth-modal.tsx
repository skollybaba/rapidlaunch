"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, UserPlus } from "lucide-react";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { buttonStyles } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
  onAuthenticated: () => void;
  redirectPath?: string;
}

export function AuthModal({
  open,
  onClose,
  onContinueAsGuest,
  onAuthenticated,
  redirectPath,
}: AuthModalProps) {
  const router = useRouter();
  const { loginWithGoogle, setUser } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function onCancel(event: Event) {
      event.preventDefault();
      onClose();
    }
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  if (!open) return null;

  function goToAuthPage() {
    const next = redirectPath ? `?next=${encodeURIComponent(redirectPath)}` : "";
    router.push(`/account${next}`);
  }

  async function handleGoogleCredential(credential: string) {
    try {
      const user = await loginWithGoogle(credential);
      setUser(user);
      onAuthenticated();
    } catch {
      goToAuthPage();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id="auth-modal"
      className="m-0 w-full max-w-md rounded-[20px] border border-neutral-300 bg-white p-0 shadow-2xl backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm sm:mx-auto sm:my-auto"
      aria-labelledby="auth-modal-title"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
              One quick step
            </p>
            <h2 id="auth-modal-title" className="mt-2 text-[1.375rem] leading-snug">
              Create an account to track this?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Signing in saves this purchase and every session you book to your
              account. You can also continue as a guest.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <GoogleAuthButton onCredential={handleGoogleCredential} />

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            or
            <span className="h-px flex-1 bg-neutral-200" />
          </div>

          <button
            type="button"
            onClick={goToAuthPage}
            className={buttonStyles({
              variant: "primary",
              size: "lg",
              className: "w-full",
            })}
          >
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            Continue with email
          </button>

          <button
            type="button"
            onClick={onContinueAsGuest}
            className={buttonStyles({
              variant: "secondary",
              size: "lg",
              className: "w-full",
            })}
          >
            Continue as guest
          </button>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-neutral-400">
          Your details are kept private and you can sign out anytime.
        </p>
      </div>
    </dialog>
  );
}
