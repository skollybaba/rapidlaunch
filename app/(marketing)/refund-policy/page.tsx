import type { Metadata } from "next";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Refund Policy | Rapid Launch",
  description:
    "How cancellations and refunds work for Rapid Launch bookings and purchases.",
};

const INTRO =
  "This policy explains when you can cancel a booking or purchase and whether you can receive a refund. It applies to all products and services sold on the Rapid Launch site, including one-on-one sessions, courses, and books.";

const SECTIONS = [
  {
    title: "Sessions and one-on-one bookings",
    body: "For one-on-one sessions you book through us, you may cancel your booking at any time and we will cancel it for you. Because a booking reserves a scheduled time for you, we do not refund the amount you paid. You can only request a cancellation within 24 hours of making the booking.",
  },
  {
    title: "The 24-hour cancellation window",
    body: "You can request a cancellation of a session booking within 24 hours of the time you completed the booking. We will cancel the booking for you as a courtesy, but no refund will be issued because the time was reserved for you.",
  },
  {
    title: "After the 24-hour window",
    body: "Once 24 hours have passed since you made the booking, we are not able to cancel it. Please contact us before the reserved time if you have any issue attending, and we will help you where we can.",
  },
  {
    title: "No-shows and late arrivals",
    body: "If you do not attend a booked session, or join more than a few minutes late, the session is considered used and the booking cannot be cancelled or rescheduled under this policy.",
  },
  {
    title: "Courses and books",
    body: "Digital courses and books are delivered to you immediately after purchase and are considered used once access is granted or the item is delivered, so they are not refundable except where required by law.",
  },
  {
    title: "Technical failure on our side",
    body: "On rare occasions a failure on our side may mean we cannot deliver what you paid for. In those cases we will cancel the affected booking or make it right, and if we cannot, we will issue a refund for the undelivered portion.",
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Legal"
        title="Refund policy."
        description="A plain-language outline of when a session or purchase can be cancelled and refunded."
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
              If you need help with a cancellation or have a question about a
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
