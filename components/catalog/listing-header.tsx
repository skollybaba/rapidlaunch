import { Reveal } from "@/components/marketing/reveal";

interface CatalogPageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function CatalogPageHeader({
  eyebrow,
  title,
  description,
}: CatalogPageHeaderProps) {
  return (
    <div className="border-b border-neutral-300 bg-neutral-100">
      <div className="mx-auto w-[min(80%,96rem)] px-6 py-14 lg:px-8 lg:py-20">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-2xl text-[1.875rem] leading-[1.16] md:text-[2.25rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-lg leading-[1.55] text-neutral-500">
              {description}
            </p>
          ) : null}
        </Reveal>
      </div>
    </div>
  );
}