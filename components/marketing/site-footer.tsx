import Link from "next/link";

const LEGAL_LINKS = ["Privacy", "Terms", "Refund policy"];
const SITE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/courses", label: "Courses" },
  { href: "/resources", label: "Resources" },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink-950">
      <div className="mx-auto w-[min(80%,96rem)] px-6 py-12 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-start">
          <div>
            <p className="font-sans text-lg font-bold tracking-tight text-white">
Rapid Launch
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
              Launch and test your ideas faster — product strategy, AI learning,
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
                className="text-sm font-medium text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:text-white"
              >
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
        <p className="mt-10 border-t border-white/10 pt-6 text-sm text-neutral-500">
          © {new Date().getFullYear()} Rapid Launch. All rights reserved.
        </p>
      </div>
    </footer>
  );
}