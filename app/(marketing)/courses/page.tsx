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
  title: "AI Courses | Rapid Launch",
  description:
    "Self-paced crash courses that move you from product thinking to working software with AI. Access is delivered in the classroom after a verified payment.",
};

async function CourseGrid() {
  const products = await listPublishedProducts({ type: "COURSE" });

  if (products.length === 0) {
    return (
      <EmptyState
        title="No courses are available yet"
        description="New courses are being prepared. Add your email on the contact page and we will let you know when the first cohort opens."
        action={
          <a
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-ink-900 px-5 text-sm font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-ink-800"
          >
            Get notified
          </a>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => (
        <Reveal key={product.id} delay={Math.min(index * 60, 360)}>
          <ProductCard
            product={product}
            href={`/courses/${product.slug}`}
          />
        </Reveal>
      ))}
    </div>
  );
}

function CourseGridFallback() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <CatalogPageHeader
        eyebrow="Learning paths"
        title="Learn the workflow from product thinking to working software."
        description="Self-paced crash courses on using AI inside product work. Every course is delivered through our classroom so you learn where the work actually happens."
      />
      <div className="flex flex-1 flex-col bg-white">
        <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-12 lg:px-8 lg:py-16">
          <Suspense fallback={<CourseGridFallback />}>
            <CourseGrid />
          </Suspense>
        </div>
      </div>
    </div>
  );
}