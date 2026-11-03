"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/account/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Purchases", icon: Package },
  { href: "/account/courses", label: "Courses", icon: GraduationCap },
  { href: "/account/sessions", label: "Sessions", icon: CalendarClock },
  { href: "/account/profile", label: "Profile", icon: Settings },
];

function monogram(name?: string | null, email?: string | null) {
  const source = (name || email || "A").trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return source.charAt(0).toUpperCase();
}

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();

  async function handleLogout() {
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
    }
  }

  const initials = monogram(user?.name, user?.email);

  return (
    <>
      {/* Desktop / tablet: the dark "hub" sidebar card with the terracotta
          active pill. */}
      <aside className="hidden h-fit flex-col overflow-hidden rounded-[20px] bg-ink-950 text-white lg:sticky lg:top-8 lg:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta-600 text-sm font-bold"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {user?.name || "My account"}
            </p>
            <p className="truncate text-xs text-white/60">{user?.email}</p>
          </div>
        </div>

        <nav aria-label="Account" className="mt-1 space-y-1 px-3 pb-3">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-[12px] px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "bg-terracotta-600 font-semibold text-white shadow-[0_6px_16px_rgb(199_93_60_/_35%)]"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 transition-transform duration-[var(--duration-fast)] group-hover:scale-110",
                    active ? "text-white" : "text-white/70"
                  )}
                />
                {link.label}
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    "ml-auto h-3.5 w-3.5 transition-opacity duration-[var(--duration-fast)]",
                    active
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-60"
                  )}
                />
              </Link>
            );
          })}

          <div aria-hidden="true" className="mx-1 my-2 h-px bg-white/10" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-3 py-2 text-sm font-medium text-white/70 transition-colors duration-[var(--duration-fast)] hover:bg-danger-600 hover:text-white"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </nav>
      </aside>

      {/* Mobile: a full-width tab strip under the page title — visible without
          opening anything. */}
      <div className="border-b border-neutral-200 lg:hidden">
        <nav
          aria-label="Account"
          className="-mx-6 flex items-center gap-x-1 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-2 lg:-mx-8"
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "text-terracotta-600"
                    : "text-neutral-500 hover:text-neutral-950"
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {link.label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-terracotta-600"
                  />
                ) : null}
              </Link>
            );
          })}

          <span
            aria-hidden="true"
            className="mx-3 h-6 w-px shrink-0 bg-neutral-200"
          />

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-sm font-semibold text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:text-danger-600"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </nav>
      </div>
    </>
  );
}
