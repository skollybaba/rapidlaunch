"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

export type AdminTheme = "light" | "dark";

export const ADMIN_THEME_STORAGE_KEY = "admin-theme";

const ATTRIBUTE = "data-admin-theme";

interface AdminThemeContextValue {
  theme: AdminTheme;
  toggle: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function readStoredTheme(): AdminTheme {
  try {
    return window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: AdminTheme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute(ATTRIBUTE, "dark");
  } else {
    root.removeAttribute(ATTRIBUTE);
  }
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  /* Initial state matches the server render (light); the mount effect syncs
     it with the persisted choice. The no-flash inline script in the admin
     layout applies the attribute before paint, so this only reconciles state. */
  const [theme, setTheme] = useState<AdminTheme>("light");

  useEffect(() => {
    const stored = readStoredTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored);
    applyTheme(stored);

    return () => {
      document.documentElement.removeAttribute(ATTRIBUTE);
    };
  }, []);

  const toggle = useCallback(() => {
    setTheme((previous) => {
      const next: AdminTheme = previous === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, next);
      } catch {
        /* Storage can be unavailable (private mode); the DOM attribute still
           applies for the current session. */
      }
      return next;
    });
  }, []);

  return (
    <AdminThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within an AdminThemeProvider");
  }
  return context;
}

export function ThemeToggle() {
  const { theme, toggle } = useAdminTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-white/60 transition-colors duration-[var(--duration-fast)] hover:bg-white/5 hover:text-white"
    >
      {isDark ? (
        <Sun aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Moon aria-hidden="true" className="h-4 w-4" />
      )}
      {isDark ? "Light mode" : "Dark mode"}
      <span
        aria-hidden="true"
        className={cn(
          "ml-auto flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-[var(--duration-fast)]",
          isDark ? "bg-terracotta-600" : "bg-white/15"
        )}
      >
        <span
          className={cn(
            "h-4 w-4 rounded-full bg-white transition-transform duration-[var(--duration-fast)]",
            isDark ? "translate-x-4" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}
