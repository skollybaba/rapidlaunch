"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  /** Short, specific headline. Say what happened, not "Success". */
  title: string;
  /** Optional second line with detail or how to recover. */
  description?: string;
  /**
   * Milliseconds before the toast auto-dismisses. `0` keeps it on screen until
   * the visitor dismisses it, which suits blocking failures.
   */
  durationMs?: number;
  /** Optional inline action such as "Retry" or "Undo". */
  action?: { label: string; onClick: () => void };
}

export interface ToastRecord extends ToastOptions {
  id: string;
  tone: ToastTone;
  durationMs: number;
}

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 9000,
};

/** Only the newest few toasts stay on screen so the view never floods. */
const MAX_VISIBLE = 4;

export type ToastInput = ToastOptions & { tone?: ToastTone };

export interface ToastApi {
  success: (input: ToastInput | string) => void;
  error: (input: ToastInput | string) => void;
  warning: (input: ToastInput | string) => void;
  info: (input: ToastInput | string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ICON = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const TONE_BADGE = {
  success: "bg-success-100 text-success-600",
  error: "bg-danger-100 text-danger-600",
  warning: "bg-warning-100 text-warning-600",
  info: "bg-lavender-100 text-terracotta-600",
} as const;

const TONE_ACCENT = {
  success: "border-l-success-600",
  error: "border-l-danger-600",
  warning: "border-l-warning-600",
  info: "border-l-terracotta-600",
} as const;

/**
 * Errors interrupt, everything else waits its turn. Tone is never the only
 * signal: each toast also carries a distinct icon and words.
 */
function isAssertive(tone: ToastTone): boolean {
  return tone === "error" || tone === "warning";
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: () => void;
}) {
  const Icon = TONE_ICON[toast.tone];

  return (
    <div
      className={cn(
        "vp-toast-enter pointer-events-auto flex w-full items-start gap-3 rounded-[12px] border border-neutral-300 border-l-4 bg-white p-4 shadow-xl",
        TONE_ACCENT[toast.tone],
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          TONE_BADGE[toast.tone],
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-950">{toast.title}</p>
        {toast.description ? (
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            {toast.description}
          </p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              onDismiss();
              toast.action?.onClick();
            }}
            className="mt-2 rounded-sm text-xs font-semibold text-terracotta-600 underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:text-terracotta-500 hover:underline focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss notification: ${toast.title}`}
        className="-mr-1 -mt-1 rounded-full p-1.5 text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-neutral-300"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, input: ToastInput | string) => {
    const options = typeof input === "string" ? { title: input } : input;
    const record = {
      tone,
      title: options.title,
      description: options.description,
      durationMs: options.durationMs ?? DEFAULT_DURATION[tone],
      action: options.action,
    };

    setToasts((current) => {
      // A repeated identical message refreshes the existing toast instead of
      // stacking duplicates when an action is double-submitted.
      const duplicate = current.find(
        (toast) => toast.tone === tone && toast.title === record.title,
      );
      if (duplicate) {
        const handle = timers.current.get(duplicate.id);
        if (handle) {
          clearTimeout(handle);
          timers.current.delete(duplicate.id);
        }
        return current.map((toast) =>
          toast.id === duplicate.id ? { ...toast, ...record } : toast,
        );
      }

      counter.current += 1;
      return [...current, { ...record, id: `toast-${counter.current}` }].slice(
        -MAX_VISIBLE,
      );
    });
  }, []);

  // Timers are tracked per toast so a dismissal never leaves a pending timeout
  // that later removes a freshly shown message with the same id.
  useEffect(() => {
    for (const toast of toasts) {
      if (toast.durationMs <= 0 || timers.current.has(toast.id)) continue;
      const handle = setTimeout(() => {
        timers.current.delete(toast.id);
        dismiss(toast.id);
      }, toast.durationMs);
      timers.current.set(toast.id, handle);
    }

    for (const [id, handle] of timers.current) {
      if (toasts.some((toast) => toast.id === id)) continue;
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, [toasts, dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const handle of pending.values()) clearTimeout(handle);
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (input) => push("success", input),
      error: (input) => push("error", input),
      warning: (input) => push("warning", input),
      info: (input) => push("info", input),
      dismiss,
    }),
    [push, dismiss],
  );

  const polite = toasts.filter((toast) => !isAssertive(toast.tone));
  const assertive = toasts.filter((toast) => isAssertive(toast.tone));

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        <div
          aria-live="polite"
          aria-atomic="false"
          className="flex w-full flex-col items-center gap-2 sm:max-w-sm sm:items-end"
        >
          {polite.map((toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </div>
        <div
          role="alert"
          aria-live="assertive"
          className="flex w-full flex-col items-center gap-2 sm:max-w-sm sm:items-end"
        >
          {assertive.map((toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Returns the toast API. Every mutating action on the site reports through this
 * so a visitor always sees the outcome of a save, submit or delete.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
