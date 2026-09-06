import type { Metadata } from "next";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Cookie Policy | Rapid Launch",
  description:
    "How Rapid Launch uses cookies and how you can control your preferences.",
};

const SECTIONS = [
  {
    title: "What cookies we use",
    body: "Rapid Launch uses a small number of cookies to keep the site reliable and to understand what visitors find useful. We use two groups: necessary cookies that are required for basic site behaviour, and optional cookies (only with your consent) that support analytics and marketing measurement.",
  },
  {
    title: "Necessary cookies",
    body: "These cookies are required for the site to function. They remember completed payments, keep a checkout session on track, and record your cookie preference itself. They are always set and cannot be switched off.",
  },
  {
    title: "Optional cookies",
    body: "With your permission we use optional cookies to measure how the site is used and to improve it. You can choose these at any time from the banner that appears on your next visit by selecting “Necessary only”.",
  },
  {
    title: "Payments and third parties",
    body: "When you buy something, payment and order processing is handled by Paystack. Paystack may set its own cookies or use equivalent technologies inside the payment flow. Their use is governed by Paystack's own privacy and cookie policies.",
  },
  {
    title: "Managing your preferences",
    body: "If you previously accepted optional cookies and want to change that, clear this site's local storage in your browser or visit the site in a private window; the consent banner will reappear and you can choose “Necessary only”.",
  },
];

export default function CookiesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Legal"
        title="Cookie policy."
        description="A short, plain-language explanation of how Rapid Launch uses cookies."
      />
      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <div className="space-y-10">
            {SECTIONS.map((section, index) => (
              <Reveal key={section.title} delay={index * 60}>
                <section>
                  <h2 className="text-[24px] leading-snug md:text-[1.375rem]">
                    {section.title}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-neutral-500">
                    {section.body}
                  </p>
                </section>
              </Reveal>
            ))}
          </div>
          <Reveal delay={80}>
            <p className="mt-12 rounded-md border border-neutral-300 bg-neutral-100 p-6 text-sm leading-relaxed text-neutral-500">
              Questions about this policy? Contact us on the{" "}
              <a
                href="/contact"
                className="font-semibold text-terracotta-600 hover:text-terracotta-500"
              >
                contact page
              </a>{" "}
              and we will respond within two working days.
            </p>
          </Reveal>
        </div>
      </div>
    </div>
  );
}