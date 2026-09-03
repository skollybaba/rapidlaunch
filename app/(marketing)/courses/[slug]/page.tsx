import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  GraduationCap,
  ListOrdered,
  MessageCircleQuestion,
  MonitorPlay,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getPublishedProductBySlug,
  getRelatedProducts,
} from "@/lib/services/catalog-service";
import { buttonStyles } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { ProductCover } from "@/components/ui/product-cover";
import { Reveal } from "@/components/marketing/reveal";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { ProductDetail } from "@/types/product";

export const dynamic = "force-dynamic";

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function resolveCourse(slug: string) {
  const product = await getPublishedProductBySlug(slug, "COURSE");
  if (!product) notFound();
  return product;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await resolveCourse(slug);
  return {
    title: product.seoTitle ?? `${product.title} | Rapid Launch`,
    description:
      product.seoDescription ??
      product.shortDescription ??
      "A self-paced AI product course delivered in Google Classroom.",
  };
}

interface DetailRowProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

function DetailRow({ label, value, icon: Icon }: DetailRowProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-ink-900">
        <Icon aria-hidden="true" className="h-4 w-4 text-lavender-200" />
      </span>
      <div className="flex flex-1 items-start justify-between gap-4">
        <dt className="text-sm font-medium text-neutral-500">{label}</dt>
        <dd className="text-right text-sm font-semibold text-neutral-950">
          {value}
        </dd>
      </div>
    </div>
  );
}

function CourseContent({ product }: { product: ProductDetail }) {
  const details = product.courseDetails;
  const duration = formatDuration(details?.durationMinutes);

  return (
    <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
        <article className="max-w-[680px]">
          {product.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.thumbnailUrl}
              alt={`Cover of ${product.title}`}
              className="mb-8 aspect-video w-full rounded-md border border-neutral-300 object-cover"
            />
          ) : (
            <ProductCover
              type="COURSE"
              title={product.title}
              subtitle={product.shortDescription}
              format="landscape"
              className="mb-8 rounded-md"
            />
          )}
          <Badge>Course</Badge>
          <h1 className="mt-4 text-[1.875rem] leading-[1.16] md:text-[2.25rem]">
            {product.title}
          </h1>
          {product.shortDescription ? (
            <p className="mt-4 text-lg leading-[1.55] text-neutral-500">
              {product.shortDescription}
            </p>
          ) : null}
          {product.description ? (
            <div className="mt-8 space-y-4">
              {product.description.split("\n\n").map((paragraph, index) => (
                <p key={index} className="text-base leading-relaxed text-neutral-700">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}

          {details?.outcomes?.length ? (
            <Reveal as="section" className="mt-10">
              <h2 className="text-[1.375rem] leading-snug">
                What you&apos;ll be able to do
              </h2>
              <ul className="mt-4 space-y-3">
                {details.outcomes.map((outcome, index) => (
                  <Reveal key={index} delay={index * 50}>
                    <li className="flex items-start gap-3 text-base leading-relaxed text-neutral-700">
                      <BadgeCheck
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 shrink-0 text-terracotta-600"
                      />
                      {outcome}
                    </li>
                  </Reveal>
                ))}
              </ul>
            </Reveal>
          ) : null}

          {details?.syllabus?.length ? (
            <Reveal as="section" className="mt-10">
              <h2 className="text-[1.375rem] leading-snug">Syllabus</h2>
              <ol className="mt-4 space-y-3">
                {details.syllabus.map((module, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-base leading-relaxed text-neutral-700"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-lavender-100">
                      <ListOrdered
                        aria-hidden="true"
                        className="h-4 w-4 text-ink-700"
                      />
                    </span>
                    <span>{module}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          ) : null}

          {details?.audience?.length ? (
            <Reveal as="section" className="mt-10">
              <h2 className="text-[1.375rem] leading-snug">Who it&apos;s for</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {details.audience.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}

          <Reveal as="section" className="mt-10">
            <div className="rounded-md border border-neutral-300 bg-neutral-100 p-6">
              <h2 className="text-[1.375rem] leading-snug">How access is granted</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                Your purchase is verified before we grant course access. After a
                successful payment you receive an email with a Google Classroom
                invitation. Use the Google account you want enrolled. It can be
                different from the email you pay with.
              </p>
            </div>
          </Reveal>
        </article>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <Reveal>
            <div className="rounded-md border border-neutral-300 bg-white p-6">
            <dl className="divide-y divide-neutral-100">
              {duration ? (
                <DetailRow icon={Clock} label="Duration" value={duration} />
              ) : null}
              {details?.level ? (
                <DetailRow icon={GraduationCap} label="Level" value={details.level} />
              ) : null}
              {details?.instructor ? (
                <DetailRow icon={UserRound} label="Instructor" value={details.instructor} />
              ) : null}
              <DetailRow
                icon={MonitorPlay}
                label="Delivery"
                value={
                  product.fulfillmentMode === "MANUAL"
                    ? "Manual enrollment"
                    : "Google Classroom"
                }
              />
            </dl>
            <p className="mt-5 text-3xl font-bold text-neutral-950">
              {formatPrice(product.priceMinor, product.currency)}
            </p>
            <Link
              href={`/checkout/${product.id}`}
              className={buttonStyles({
                variant: "primary",
                size: "lg",
                className: "mt-6 w-full",
              })}
            >
              Buy this course
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className={buttonStyles({
                variant: "secondary",
                className: "mt-3 w-full",
              })}
            >
              <MessageCircleQuestion aria-hidden="true" className="h-4 w-4" />
              Not sure? Get a recommendation
            </Link>
          </div>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}

async function RelatedCourses({ product }: { product: ProductDetail }) {
  const related = await getRelatedProducts(product);

  if (related.length === 0) return null;

  return (
    <section className="bg-neutral-100">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] px-6 py-12 lg:px-8 lg:py-16">
        <h2 className="text-[1.375rem] leading-snug">You might also take</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              href={`/courses/${item.slug}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { slug } = await params;
  const product = await resolveCourse(slug);

  return (
    <div className="flex flex-1 flex-col">
      <CourseContent product={product} />
      <RelatedCourses product={product} />
    </div>
  );
}