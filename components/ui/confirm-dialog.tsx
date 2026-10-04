"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  /** Say what will be lost. Vague prompts get cancelled or rubber-stamped. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for destructive work, `primary` for ordinary confirmation. */
  tone?: "danger" | "primary";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/**
 * Promise-based confirmation built on the native `<dialog>` element, which
 * gives focus containment, Escape handling and focus restoration without
 * reimplementing them. It replaces `window.confirm`, whose dialog cannot be
 * styled, described or translated, and which blocks the main thread.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending({ tone: "primary", ...options, resolve });
      }),
    []
  );

  const settle = useCallback((confirmed: boolean) => {
    setPending((current) => {
      dialogRef.current?.close();
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (pending && !dialog.open) {
      dialog.showModal();
      dialog
        .querySelector<HTMLElement>("[data-confirm-initial-focus]")
        ?.focus();
    }
  }, [pending]);

  const tone = pending?.tone ?? "primary";
  const confirmLabel = pending?.confirmLabel ?? "Confirm";
  const cancelLabel = pending?.cancelLabel ?? "Cancel";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-dialog-title"
        aria-describedby={pending?.description ? "confirm-dialog-body" : undefined}
        // Escape must resolve the promise, otherwise the dialog would close
        // while state still believes a prompt is open and reopens on next paint.
        onCancel={(event) => {
          event.preventDefault();
          settle(false);
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) settle(false);
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-[20px] bg-white p-0 shadow-2xl backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm"
      >
        {pending ? (
          <div className="p-6">
            <div className="flex items-start gap-3">
              {tone === "danger" ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-600">
                  <AlertTriangle aria-hidden="true" className="size-5" />
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <h2
                  id="confirm-dialog-title"
                  className="text-lg font-bold text-neutral-950"
                >
                  {pending.title}
                </h2>
                {pending.description ? (
                  <p
                    id="confirm-dialog-body"
                    className="mt-2 text-sm leading-relaxed text-neutral-500"
                  >
                    {pending.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => settle(false)}
                className={buttonStyles({ variant: "secondary" })}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                data-confirm-initial-focus
                onClick={() => settle(true)}
                className={buttonStyles({
                  variant: "primary",
                  className:
                    tone === "danger"
                      ? "bg-danger-600 hover:bg-danger-600/90"
                      : undefined,
                })}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Asks the visitor to confirm a consequential action.
 *
 * ```ts
 * const confirm = useConfirm();
 * if (!(await confirm({ title: "Delete course?", tone: "danger" }))) return;
 * ```
 */
export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return context;
}