import type { Metadata } from "next";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Terms & Conditions | Rapid Launch",
  description:
    "The terms and conditions that govern your use of the Rapid Launch site and the products and services you buy.",
};

const INTRO =
  "These terms and conditions (the \u201cTerms\u201d) govern your use of the Rapid Launch website and your purchase of our products and services. By using the site or completing a purchase, you agree to these Terms. Please read them carefully.";

const SECTIONS = [
  {
    title: "About our services",
    body: "Rapid Launch provides product strategy advice, AI learning materials, one-on-one consulting sessions, courses, and books. The specific scope of each product is described on its page at the time of purchase.",
  },
  {
    title: "Age and eligibility",
    body: "You must be at least 18 years old to purchase from us. By completing a purchase you confirm that you are of legal age and that the details you provide are accurate.",
  },
  {
    title: "Payments",
    body: "Payments are processed securely by Paystack. When you pay, you authorise the charge for the item amount, and your order is confirmed once payment is verified on our side.",
  },
  {
    title: "Cancellations and refunds",
    body: "One-on-one session bookings may be cancelled within 24 hours of booking, but because a time is reserved for you, they are not refunded. Please see our Refund Policy for the full details on what can be cancelled and refunded.",
  },
  {
    title: "Access to courses and content",
    body: "When you purchase a course, we grant you a personal, non-transferable right to access it. You may not share your access, redistribute the content, or resell anything you buy from us.",
  },
  {
    title: "Acceptable use",
    body: "You agree not to misuse the site, attempt to disrupt it, or use it to send unlawful or harmful content. We may suspend access if you breach these Terms.",
  },
  {
    title: "Intellectual property",
    body: "All content on the site, including our materials, branding, and product content, is owned by or licensed to Rapid Launch and is protected by copyright and other laws. You may use it only as we allow in these Terms.",
  },
  {
    title: "Limitation of liability",
    body: "We provide our products and services to a reasonable standard, but we are not liable for indirect or consequential loss, and our total liability is limited to the amount you paid for the product or service in question.",
  },
  {
    title: "Third-party services",
    body: "Courses may be delivered through an online classroom and sessions may run over a third-party video service. These services are governed by their own terms, and your use of them is subject to their providers' policies.",
  },
  {
    title: "Changes to these Terms",
    body: "We may update these Terms from time to time. When we make material changes, we will update this page. Continued use of the site after changes are posted means you accept the updated Terms.",
  },
  {
    title: "Contact",
    body: "If you have any questions about these Terms, please get in touch through the contact page and we will be happy to help.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Legal"
        title="Terms & conditions."
        description="The rules that apply when you use the Rapid Launch site and buy from us."
      />
      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <Reveal>
            <p className="text-base leading-relaxed text-neutral-700">{INTRO}</p>
          </Reveal>
          <div className="mt-10 space-y-10">
            {SECTIONS.map((section, index) => (
              <Reveal key={section.title} delay={index * 60}>
                <section>
                  <h2 className="text-[1.375rem] leading-snug">
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
              Questions about these Terms? Contact us on the{" "}
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
