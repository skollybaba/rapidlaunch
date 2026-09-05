import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Barcode, BookOpenCheck, Download, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getPublishedProductBySlug } from "@/lib/services/catalog-service";
import { ProductCover } from "@/components/ui/product-cover";
import { Price } from "@/components/ui/price";
import { Reveal } from "@/components/marketing/reveal";
import type { ProductDetail } from "@/types/product";

export const dynamic = "force-dynamic";

interface BookDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function resolveBook(slug: string) {
  const product = await getPublishedProductBySlug(slug, "BOOK");
  if (!product) notFound();
  return product;
}

export async function generateMetadata({
  params,
}: BookDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await resolveBook(slug);
  return {
    title: product.seoTitle ?? `${product.title} | Rapid Launch`,
    description:
      product.seoDescription ??
      product.shortDescription ??
      "A practical book on building products with AI.",
  };
}

const DELIVERY_LABELS: Record<string, string> = {
  DIGITAL_DOWNLOAD: "Digital download",
  PHYSICAL: "Physical copy",
  EXTERNAL: "Purchased on an external store",
};

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

function BookContent({ product }: { product: ProductDetail }) {
  const details = product.bookDetails;
  const deliveryMode = details?.deliveryMode
    ? DELIVERY_LABELS[details.deliveryMode]
    : undefined;

  return (
    <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
        <article className="max-w-[680px]">
          {product.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.thumbnailUrl}
              alt={`Cover of ${product.title}`}
              className="mb-8 aspect-[2/3] w-full max-w-72 rounded-md border border-neutral-300 object-cover shadow-md shadow-ink-700/10"
            />
          ) : (
            <ProductCover
              type="BOOK"
              title={product.title}
              subtitle={product.shortDescription}
              format="portrait"
              className="mb-8 w-full max-w-72 rounded-md"
            />
          )}
          <Badge>Book</Badge>
          <h1 className="mt-4 text-[1.875rem] leading-[1.16] md:text-[2.25rem]">
            {product.title}
          </h1>
          {details?.author ? (
            <p className="mt-3 text-base font-medium text-neutral-500">
              By {details.author}
            </p>
          ) : null}
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
        </article>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <Reveal>
          <div className="rounded-md border border-neutral-300 bg-white p-6">
            <dl className="divide-y divide-neutral-100">
              {details?.format ? (
                <DetailRow icon={FileText} label="Format" value={details.format} />
              ) : null}
              {details?.isbn ? (
                <DetailRow icon={Barcode} label="ISBN" value={details.isbn} />
              ) : null}
              <DetailRow
                icon={Download}
                label="Delivery"
                value={deliveryMode ?? "Fulfillment on purchase"}
              />
            </dl>
            <p className="mt-5 text-3xl font-bold text-neutral-950">
              <Price
                amountMinor={product.priceMinor}
                currency={product.currency}
              />
            </p>
            {product.fulfillmentMode === "EXTERNAL" ? (
              <Link
                href={details?.externalUrl ?? "/books"}
                className={buttonStyles({
                  variant: "primary",
                  size: "lg",
                  className: "mt-6 w-full",
                })}
              >
                Buy on external store
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={`/checkout/${product.id}`}
                className={buttonStyles({
                  variant: "primary",
                  size: "lg",
                  className: "mt-6 w-full",
                })}
              >
                Buy this book
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/contact"
              className={buttonStyles({
                variant: "secondary",
                className: "mt-3 w-full",
              })}
            >
              <BookOpenCheck aria-hidden="true" className="h-4 w-4" />
              Question about the book?
            </Link>
          </div>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}

export default async function BookDetailPage({
  params,
}: BookDetailPageProps) {
  const { slug } = await params;
  const product = await resolveBook(slug);

  return (
    <div className="flex flex-1 flex-col">
      <BookContent product={product} />
    </div>
  );
}