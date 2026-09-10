import type { Metadata } from "next";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Refund Policy | Rapid Launch",
  description:
    "How rescheduling and refunds work for Rapid Launch bookings and purchases.",
};

const INTRO =
  "This policy explains when you can reschedule a booking or cancel a purchase and whether you can receive a refund. It applies to all products and services sold on the Rapid Launch site, including one-on-one sessions, courses, and books.";

const SECTIONS = [
  {
    title: "Sessions and one-on-one bookings",
    body: "For one-on-one sessions you book through us, the reservation is not refundable. If your session has not started and is more than 24 hours away, you can request a new time instead from your account's Sessions page. No refund is issued because the time was reserved for you.",
  },
  {
    title: "Rescheduling your session",
    body: "You can request to reschedule a session so long as your session is more than 24 hours away. Open your account, go to Sessions, and use the Request reschedule button beside the session. We will confirm the new time with you before it is applied.",
  },
  {
    title: "The 24-hour window",
    body: "Sessions within 24 hours of their start time cannot be rescheduled or cancelled, and no refund will be issued. The time is considered reserved. Please contact us as early as possible if you can no longer attend.",
  },
  {
    title: "No-shows and late arrivals",
    body: "If you do not attend a booked session, or join more than a few minutes late, the session is considered used and cannot be rescheduled, cancelled, or refunded under this policy.",
  },
  {
    title: "Courses and books",
    body: "Digital courses and books are delivered to you immediately after purchase and are considered used once access is granted or the item is delivered, so they are not refundable except where required by law.",
  },
  {
    title: "Technical failure on our side",
    body: "On rare occasions a failure on our side may mean we cannot deliver what you paid for. In those cases we will make it right, offer a replacement time or a similar experience, and if we cannot, we will issue a refund for the undelivered portion.",
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Legal"
        title="Refund policy."
        description="A plain-language outline of when a session or purchase can be rescheduled and refunded."
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
              If you need help with a reschedule or have a question about a
              refund, please contact us on the{" "}
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
