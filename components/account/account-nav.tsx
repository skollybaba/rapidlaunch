"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, LayoutDashboard, LogOut, Package } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";

const NAV_LINKS = [
  { href: "/account/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Purchases", icon: Package },
  { href: "/account/sessions", label: "Sessions", icon: CalendarClock },
];

export function AccountNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-fit flex-col rounded-[16px] border border-neutral-300 bg-white p-4">
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
          onClick={() => logout()}
          className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:bg-danger-100 hover:text-danger-600"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          Sign out
        </button>
      </nav>
    </aside>
  );
}
