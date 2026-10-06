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

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  function handleNavClick() {
    if (isMobile) {
      setMenuOpen(false);
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
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
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (!isMobile) {
    return (
      <aside className="flex h-fit flex-col rounded-[16px] border border-neutral-300 bg-white p-4 lg:sticky lg:top-8 lg:self-start">
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
    );
  }

  return (
    <div className="relative lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        className="p-2 rounded-[10px] border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {menuOpen ? (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 z-50 w-64 origin-top-right animate-fade-in"
        >
          <div className="rounded-[16px] border border-neutral-300 bg-white p-3 shadow-xl">
            <div className="border-b border-neutral-200 px-2 py-3">
              <p className="text-sm font-bold text-neutral-950">
                {user?.name || "My account"}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">{user?.email}</p>
            </div>

            <nav aria-label="Account" className="mt-3 space-y-1">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleNavClick}
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
  );
}