"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: (listener?: (notification: { isNotDisplayed: () => boolean }) => void) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: string;
              shape?: "rectangular" | "pill";
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleAuthButtonProps {
  onCredential: (credential: string) => Promise<void> | void;
  oneTap?: boolean;
  autoSelect?: boolean;
  className?: string;
}

export function GoogleAuthButton({
  onCredential,
  oneTap = true,
  autoSelect = true,
  className,
}: GoogleAuthButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);
  const renderedRef = useRef(false);
  const startedRef = useRef(false);
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || startedRef.current) return;
    startedRef.current = true;
    const clientId: string = GOOGLE_CLIENT_ID;

    function initGoogle() {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            void onCredentialRef.current(response.credential);
          }
        },
        auto_select: autoSelect,
      });

      if (buttonRef.current && !renderedRef.current) {
        renderedRef.current = true;
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: 1000,
        });
      }

      if (oneTap) {
        window.google.accounts.id.prompt();
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [oneTap, autoSelect]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-sm text-neutral-500" role="alert">
        Google sign-in is not configured on this site.
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-neutral-500" role="alert">
        Could not load Google sign-in. Try again.
      </p>
    );
  }

  return (
    <div
      ref={buttonRef}
      className={`flex w-full justify-center overflow-hidden ${className ?? ""}`}
    />
  );
}
