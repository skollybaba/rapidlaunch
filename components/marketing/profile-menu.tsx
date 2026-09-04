"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";

function initials(name?: string, email?: string): string {
  const text = (name ?? "").trim();
  if (text) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return words[0].slice(0, 2).toUpperCase();
  }
  const local = (email ?? "").split("@")[0]?.trim();
  return (local || "?").slice(0, 2).toUpperCase();
}

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const isAdmin = user.role === "admin";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-terracotta-600 text-sm font-bold tracking-tight text-white transition-colors duration-[var(--duration-fast)] hover:bg-terracotta-500"
      >
        {initials(user.name, user.email)}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-[12px] border border-ink-800 bg-ink-950 shadow-xl shadow-ink-950/40"
        >
          <div className="border-b border-ink-800 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">
              {user.name || "My account"}
            </p>
            <p className="truncate text-xs text-neutral-400">{user.email}</p>
          </div>
          {isAdmin ? (
            <Link
              href="/admin/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors duration-[var(--duration-fast)] hover:bg-ink-800 hover:text-white"
            >
              <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
              Go to back office
            </Link>
          ) : (
            <Link
              href="/account/overview"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors duration-[var(--duration-fast)] hover:bg-ink-800 hover:text-white"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              View account
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              router.replace("/");
            }}
            className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-neutral-200 transition-colors duration-[var(--duration-fast)] hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}