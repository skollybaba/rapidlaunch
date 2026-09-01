"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

const NAV_LINKS = [
  { href: "/courses", label: "Courses" },
  { href: "/services", label: "Services" },
  { href: "/books", label: "Books" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-ink-950">
      <div className="mx-auto flex w-[min(80%,96rem)] items-center justify-between gap-6 px-6 py-5 lg:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 font-sans text-lg font-bold tracking-tight text-white"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.svg"
              alt=""
              aria-hidden="true"
              className="h-7 w-7 transition-transform duration-[var(--duration-standard)] group-hover:-translate-y-0.5"
            />
          </span>
          Rapid Launch
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
                  active ? "text-white" : "text-neutral-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/services/90-minute-one-on-one-strategy-session"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-terracotta-600 px-5 text-sm font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-terracotta-500"
        >
          Book a session
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}