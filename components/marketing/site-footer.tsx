import Link from "next/link";
import { Mail, Rocket, Sparkles, Users, Wrench } from "lucide-react";

const LEGAL_LINKS = ["Privacy", "Terms", "Refund policy"];
const SITE_LINKS = [
  { href: "/about", label: "About", icon: Sparkles },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/courses", label: "Courses", icon: Users },
  { href: "/resources", label: "Resources", icon: Rocket },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink-950">
      <div className="mx-auto w-[min(80%,96rem)] px-6 py-12 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-start">
          <div>
            <p className="inline-flex items-center gap-3 font-sans text-xl font-bold tracking-tight text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-icon.svg"
                alt=""
                aria-hidden="true"
                className="h-9 w-9"
              />
              Rapid Launch
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
              Launch and test your ideas faster: product strategy, AI learning,
              and MVP execution.
            </p>
          </div>
          <nav aria-label="Site" className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Explore
            </p>
            {SITE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group inline-flex items-center gap-2.5 text-sm font-medium text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:text-white"
              >
                <link.icon
                  aria-hidden="true"
                  className="h-4 w-4 text-terracotta-600 transition-colors duration-[var(--duration-fast)] group-hover:text-white"
                />
                {link.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Legal" className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Legal
            </p>
            {LEGAL_LINKS.map((label) => (
              <Link
                key={label}
                href={`/${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm font-medium text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:text-white"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/cookies"
              className="text-sm font-medium text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:text-white"
            >
              Cookie policy
            </Link>
          </nav>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p className="inline-flex items-center gap-2 text-sm text-neutral-500">
            <Mail aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
            <a
              href="mailto:support@quicklaunch.example"
              className="transition-colors duration-[var(--duration-fast)] hover:text-white"
            >
              support@quicklaunch.example
            </a>
          </p>
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} Rapid Launch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}