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
  ReceiptText,
  LogOut,
  ExternalLink,
  Inbox,
  Mail,
  Workflow,
  Tag,
  ChevronDown,
  BarChart2,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/admin/admin-theme";
import { useToast } from "@/components/ui/toast";
import { useState, type RefObject } from "react";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavLink[];
}

const NAV_LINKS: NavLink[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard & Insights",
    icon: LayoutDashboard,
  },
];

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Metrics & Analytics",
    icon: BarChart2,
    children: [
      { href: "/admin/metrics/revenue", label: "Revenue", icon: ChartNoAxesCombined },
      { href: "/admin/metrics/funnel", label: "Funnel", icon: CalendarDays },
      { href: "/admin/metrics/usage", label: "Usage", icon: Users },
      { href: "/admin/metrics/customers", label: "Customers & LTV", icon: BookOpen },
      { href: "/admin/metrics/insights", label: "Insights", icon: Workflow },
      { href: "/admin/metrics/profit", label: "Profit calculator", icon: ReceiptText },
    ],
  },
  {
    label: "Operations",
    icon: FolderOpen,
    children: [
      { href: "/admin/orders", label: "Orders", icon: ReceiptText },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/enrollees", label: "Enrollees", icon: Users },
      { href: "/admin/resources", label: "Resources", icon: FolderOpen },
    ],
  },
  {
    label: "Growth",
    icon: ChartNoAxesCombined,
    children: [
      { href: "/admin/courses", label: "Courses", icon: BookOpen },
      { href: "/admin/services", label: "Services", icon: ChartNoAxesCombined },
      { href: "/admin/submissions", label: "Submissions", icon: Inbox },
      { href: "/admin/coupons", label: "Discount codes", icon: Tag },
    ],
  },
  {
    label: "Communication",
    icon: Mail,
    children: [
      { href: "/admin/email-broadcast", label: "Email & Broadcasting", icon: Mail },
      { href: "/admin/automation", label: "Automation & Sequences", icon: Workflow },
    ],
  },
];

interface AdminNavProps {
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  toggleRef?: RefObject<HTMLButtonElement | null>;
}

export function AdminNav({
  open,
  onToggle,
  onNavigate,
  toggleRef,
}: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const isGroupOpen = (label: string) => openGroup === label;
  const isGroupActive = (group: NavGroup) =>
    group.children.some((child) => pathname.startsWith(child.href));
  const isLinkActive = (href: string) => pathname === href;

  const toggleGroup = (label: string) => {
    setOpenGroup((prev) => (prev === label ? null : label));
  };

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-terracotta-600">
          <ChartNoAxesCombined
            aria-hidden="true"
            className="h-4 w-4 text-white"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Back office</p>
          <p className="text-[11px] text-white/60">Rapid Launch</p>
        </div>
        <button
          ref={toggleRef}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="admin-nav-panel"
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-white/70 transition-colors duration-[var(--duration-fast)] hover:bg-white/10 hover:text-white lg:hidden"
        >
          {open ? (
            <X aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Menu aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </div>

      <div
        id="admin-nav-panel"
        className={`${
          open ? "flex" : "hidden"
        } min-h-0 max-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-hidden lg:flex lg:max-h-none`}
      >
        <nav
          aria-label="Back office"
          className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-2"
        >
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
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

          {NAV_GROUPS.map((group) => {
            const groupActive = isGroupActive(group);
            const groupOpen = isGroupOpen(group.label);
            const Icon = group.icon;
            return (
              <div key={group.label} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={groupOpen}
                  aria-controls={`nav-group-${group.label}`}
                  className={`flex w-full min-h-11 items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
                    groupActive || groupOpen
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {group.label}
                  <ChevronDown
                    aria-hidden="true"
                    className={`ml-auto h-4 w-4 transition-transform ${groupOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  id={`nav-group-${group.label}`}
                  className={`overflow-hidden transition-all duration-200 ${
                    groupOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                  role="group"
                  aria-label={`${group.label} submenu`}
                >
                  <div className="pl-9 space-y-0.5 pt-1 pb-2">
                    {group.children.map((child) => {
                      const active = isLinkActive(child.href);
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-sm transition-colors duration-[var(--duration-fast)] ${
                            active
                              ? "bg-white/10 text-white"
                              : "text-white/60 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <ChildIcon
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <ThemeToggle />
          <Link
            href="/"
            onClick={onNavigate}
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
              try {
                await logout();
                toast.success({ title: "Signed out" });
                router.replace("/");
              } catch {
                toast.error({
                  title: "We couldn't sign you out",
                  description: "Please try again.",
                });
              }
            }}
            className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-white/60 transition-colors duration-[var(--duration-fast)] hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
