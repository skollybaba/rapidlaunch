"use client";

import type { ReactNode } from "react";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Client boundary for site-wide interaction feedback. Mounted once in the root
 * layout so every page and layout can raise toasts and confirmation prompts.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}