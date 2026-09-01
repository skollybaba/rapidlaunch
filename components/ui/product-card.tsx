import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProductCover } from "@/components/ui/product-cover";
import { formatPrice } from "@/lib/utils";
import type { ProductSummary, ProductType } from "@/types/product";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<ProductType, string> = {
  COURSE: "Course",
  BOOK: "Book",
  CONSULTATION: "Consultation",
  MVP_SERVICE: "MVP service",
};

const TYPE_FORMAT: Record<ProductType, "landscape" | "portrait"> = {
  COURSE: "landscape",
  BOOK: "portrait",
  CONSULTATION: "landscape",
  MVP_SERVICE: "landscape",
};

interface ProductCardProps {
  product: ProductSummary;
  href: string;
  className?: string;
}

export function ProductCard({ product, href, className }: ProductCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-md border border-neutral-300 bg-white transition-all duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:border-ink-700 hover:shadow-md hover:shadow-ink-700/10",
        className
      )}
    >
      <div className="relative overflow-hidden bg-neutral-100">
        {product.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.thumbnailUrl}
            alt=""
            className={cn(
              "h-full w-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]",
              TYPE_FORMAT[product.type] === "landscape"
                ? "aspect-video"
                : "aspect-[2/3]"
            )}
            loading="lazy"
          />
        ) : (
          <ProductCover
            type={product.type}
            title={product.title}
            subtitle={product.shortDescription}
            format={TYPE_FORMAT[product.type]}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <Badge>{TYPE_LABELS[product.type]}</Badge>
          {product.featured ? (
            <span className="text-xs font-semibold text-terracotta-600">
              Featured
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 text-[1.25rem] leading-snug">{product.title}</h3>
        {product.shortDescription ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-500">
            {product.shortDescription}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <span className="text-sm font-bold text-neutral-950">
            {formatPrice(product.priceMinor, product.currency)}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 transition-colors duration-[var(--duration-fast)] group-hover:text-terracotta-500">
            View details
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-300 bg-white">
      <div className="aspect-video animate-pulse bg-neutral-100" />
      <div className="p-6">
        <div className="h-5 w-20 animate-pulse rounded-full bg-neutral-100" />
        <div className="mt-4 h-5 w-3/4 animate-pulse rounded-md bg-neutral-100" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-neutral-100" />
        <div className="mt-5 h-5 w-28 animate-pulse rounded-md bg-neutral-100" />
      </div>
    </div>
  );
}