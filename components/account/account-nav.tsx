"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  X,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";

const NAV_LINKS = [
  { href: "/account/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Purchases", icon: Package },
  { href: "/account/courses", label: "Courses", icon: GraduationCap },
  { href: "/account/sessions", label: "Sessions", icon: CalendarClock },
  { href: "/account/profile", label: "Profile", icon: Settings },
];

const FALLBACK_HEADER_HEIGHT = 88;

function measureHeaderHeight() {
  const bar = document.querySelector<HTMLElement>("header > div");
  return bar
    ? Math.round(bar.getBoundingClientRect().height)
    : FALLBACK_HEADER_HEIGHT;
}

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(FALLBACK_HEADER_HEIGHT);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      toast.success({ title: "Signed out" });
      router.replace("/");
    } catch {
      toast.error({
        title: "We couldn't sign you out",
        description: "Please try again.",
        action: { label: "Retry", onClick: () => void handleLogout() },
      });
    } finally {
      setSigningOut(false);
    }
  }

  function toggleMenu() {
    if (!menuOpen) setHeaderHeight(measureHeaderHeight());
    setMenuOpen(!menuOpen);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const currentLink = NAV_LINKS.find((link) => pathname === link.href);
  const CurrentIcon = currentLink?.icon ?? Settings;
  const currentLabel = currentLink?.label ?? "My account";

  return (
    <>
      <aside className="hidden h-fit flex-col rounded-[16px] border border-neutral-300 bg-white p-4 lg:sticky lg:top-8 lg:flex lg:self-start">
        <div className="border-b border-neutral-200 px-2 pb-4">
          <p className="text-sm font-bold text-neutral-950">
            {user?.name || "My account"}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">{user?.email}</p>
        </div>

        <nav aria-label="Account" className="mt-4 space-y-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
                  active
                    ? "bg-lavender-100 text-ink-950"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            aria-busy={signingOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:bg-danger-100 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-danger-600/30 border-t-danger-600" />
            ) : (
              <LogOut aria-hidden="true" className="h-4 w-4" />
            )}
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </nav>
      </aside>

      <div className="lg:hidden">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-label={`${menuOpen ? "Close" : "Open"} account navigation: ${currentLabel}`}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[16px] border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-50"
        >
          <span className="flex items-center gap-3">
            <CurrentIcon aria-hidden="true" className="h-4 w-4 text-neutral-500" />
            {currentLabel}
          </span>
          {menuOpen ? (
            <X aria-hidden="true" className="h-4 w-4 text-neutral-500" />
          ) : (
            <Menu aria-hidden="true" className="h-4 w-4 text-neutral-500" />
          )}
        </button>

        {menuOpen ? (
          <div
            id="account-mobile-menu"
            ref={menuRef}
            style={{
              top: headerHeight,
              maxHeight: `calc(100dvh - ${headerHeight}px)`,
            }}
            className="animate-slide-down fixed inset-x-0 z-40 overflow-y-auto border-b border-neutral-300 bg-white shadow-xl"
          >
            <div className="mx-auto w-[98%] px-6 py-4 md:w-[min(83%,96rem)]">
              <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-950">
                    {user?.name || "My account"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {user?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close account navigation"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 hover:text-neutral-950"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <nav aria-label="Account" className="mt-3 space-y-1">
                {NAV_LINKS.map((link) => {
                  const active = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
                        active
                          ? "bg-lavender-100 text-ink-950"
                          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={signingOut}
                  aria-busy={signingOut}
                  className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:bg-danger-100 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOut ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-danger-600/30 border-t-danger-600" />
                  ) : (
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                  )}
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </nav>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
