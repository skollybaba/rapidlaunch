import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogPageHeader } from "@/components/catalog/listing-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/marketing/reveal";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/ui/product-card";
import { listPublishedProducts } from "@/lib/services/catalog-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Books | Rapid Launch",
  description:
    "Practical, focused reading on product management and building software with AI.",
};

async function BookGrid() {
  const products = await listPublishedProducts({ type: "BOOK" });

  if (products.length === 0) {
    return (
      <EmptyState
        title="No books are published yet"
        description="New books are in production. Tell us what you would like covered and we will keep you posted."
        action={
          <a
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-ink-900 px-5 text-sm font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-ink-800"
          >
            Contact us
          </a>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <Reveal key={product.id} delay={Math.min(index * 60, 360)}>
          <ProductCard
            product={product}
            href={`/books/${product.slug}`}
          />
        </Reveal>
      ))}
    </div>
  );
}

function BookGridFallback() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default function BooksPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Reading"
        title="Practical, focused reading on building products with AI."
        description="Books that compress hard-won product experience into a few hours of focused reading."
      />
      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-[min(80%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <Suspense fallback={<BookGridFallback />}>
            <BookGrid />
          </Suspense>
        </div>
      </div>
    </div>
  );
}