"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { ProfileMenu } from "@/components/marketing/profile-menu";

const NAV_LINKS = [
  { href: "/courses", label: "Courses" },
  { href: "/services", label: "Services" },
  { href: "/books", label: "Books" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-ink-950/95 shadow-sm shadow-ink-950/20 backdrop-blur">
      <div className="mx-auto flex w-[98%] md:w-[min(83%,96rem)] items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={closeMenu}
          className="group inline-flex items-center gap-3 font-sans text-xl font-bold tracking-tight text-white"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.svg"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 transition-transform duration-[var(--duration-standard)] group-hover:-translate-y-0.5"
            />
          </span>
          Rapid Launch
        </Link>

        <nav
          aria-label="Main"
          className="hidden items-center gap-7 md:flex"
        >
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
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

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/book"
            className="hidden h-11 items-center justify-center gap-2 rounded-pill bg-terracotta-600 px-5 text-sm font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-terracotta-500 sm:inline-flex"
          >
            Book a session
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>

          {!user ? (
            <Link
              href="/account"
              className="hidden h-11 items-center justify-center rounded-pill border border-white/40 px-5 text-sm font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-white/10 sm:inline-flex"
            >
              Sign in
            </Link>
          ) : (
            <ProfileMenu />
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className="inline-flex h-11 w-11 items-center justify-center rounded-pill text-white transition-colors duration-[var(--duration-fast)] hover:bg-ink-800 md:hidden"
          >
            {menuOpen ? (
              <X aria-hidden="true" className="h-6 w-6" />
            ) : (
              <Menu aria-hidden="true" className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="mobile-menu"
          className="border-t border-ink-800 bg-ink-950 md:hidden"
        >
          <nav
            aria-label="Mobile"
            className="mx-auto w-[98%] md:w-[min(83%,96rem)] px-4 py-4 sm:px-6"
          >
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => {
                const active =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center border-b border-ink-800/70 py-3 text-base transition-colors duration-[var(--duration-fast)] ${
                        active
                          ? "text-white"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/book"
                onClick={closeMenu}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-terracotta-600 px-5 text-sm font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-terracotta-500"
              >
                Book a session
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              {!user ? (
                <Link
                  href="/account"
                  onClick={closeMenu}
                  className="inline-flex h-11 w-full items-center justify-center rounded-pill border border-white/40 px-5 text-sm font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-white/10"
                >
                  Sign in
                </Link>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}