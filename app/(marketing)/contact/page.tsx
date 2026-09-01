import type { Metadata } from "next";
import { Clock, HelpCircle, ShieldCheck } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { ContactForm } from "@/components/marketing/contact-form";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Contact | Rapid Launch",
  description:
    "Get in touch about consulting, MVP builds, courses, or support. Replies within two working days.",
};

const FACTS = [
  {
    icon: Clock,
    title: "Response time",
    body: "We reply to every message within two working days — usually faster during normal hours (WAT).",
  },
  {
    icon: HelpCircle,
    title: "Already purchased?",
    body: "Mention your order reference (starts with QL-) and we can look it up immediately.",
  },
  {
    icon: ShieldCheck,
    title: "Payments",
    body: "Payment issues are investigated on the provider side too. Include the reference shown on your receipt.",
  },
];

export default function ContactPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Contact"
        title="Tell us where you are."
        description="A session, an MVP sprint, a question about access — choosing a reason below pre-fills your message so we can route it correctly."
      />

      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-[min(80%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <Reveal>
              <ContactForm />
            </Reveal>

            <div className="space-y-6">
              {FACTS.map((fact, index) => (
                <Reveal key={fact.title} delay={index * 70}>
                  <div className="rounded-md border border-neutral-300 bg-neutral-100 p-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-ink-900">
                        <fact.icon
                          aria-hidden="true"
                          className="h-4 w-4 text-lavender-200"
                        />
                      </span>
                      <h2 className="text-[1.125rem] leading-snug">
                        {fact.title}
                      </h2>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                      {fact.body}
                    </p>
                  </div>
                </Reveal>
              ))}

              <Reveal delay={220}>
                <div className="rounded-md border border-neutral-300 bg-white p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
                    On social
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                    Product notes, quick guides, and session announcements are
                    shared on our social channels.
                  </p>
                  <ul className="mt-4 text-sm font-semibold text-terracotta-600">
                    <li className="border-t border-neutral-100 py-2">
                      <a
                        href="mailto:support@quicklaunch.example?subject=Social%20link"
                        className="transition-colors duration-[var(--duration-fast)] hover:text-terracotta-500"
                      >
                        Request social links
                      </a>
                    </li>
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}