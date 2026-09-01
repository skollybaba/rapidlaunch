import { ProductCardSkeleton } from "@/components/ui/product-card";

export default function CoursesLoading() {
  return (
    <div className="mx-auto w-[min(80%,96rem)] px-6 py-12 lg:px-8 lg:py-16">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}