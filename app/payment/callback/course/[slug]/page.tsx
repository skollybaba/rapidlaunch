import PaymentCallbackView from "@/components/payment/payment-callback-view";

interface CourseCallbackPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Course payment confirmation. The course slug is part of the URL
 * (`/payment/callback/course/<slug>?reference=...`) so each course has its own
 * confirmation URL, which keeps ad-platform purchase tracking attributable to a
 * specific course. The slug is a label only; the payment is still verified
 * server-side from the reference.
 */
export default async function CoursePaymentCallbackPage({
  params,
}: CourseCallbackPageProps) {
  const { slug } = await params;
  return <PaymentCallbackView courseSlug={slug} />;
}
