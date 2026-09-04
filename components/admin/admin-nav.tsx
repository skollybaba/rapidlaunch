"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  CalendarDays,
  Users,
  BookOpen,
  FolderOpen,
  LogOut,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard & Insights", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/enrollees", label: "Enrollees", icon: Users },
  { href: "/admin/resources", label: "Resources", icon: FolderOpen },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-terracotta-600">
          <ChartNoAxesCombined aria-hidden="true" className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Back office</p>
          <p className="text-[11px] text-white/60">Rapid Launch</p>
        </div>
      </div>

      <nav aria-label="Back office" className="mt-4 flex-1 space-y-1 px-3">
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
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-white/60 transition-colors duration-[var(--duration-fast)] hover:bg-white/5 hover:text-white"
        >
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
          View live site
        </Link>
        <p className="mt-3 px-3 text-xs text-white/40">
          Signed in as {user?.email}
        </p>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/");
          }}
          className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-white/60 transition-colors duration-[var(--duration-fast)] hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}
