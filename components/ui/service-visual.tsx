"use client";

import { useState } from "react";

import { ProductCover, type ProductCoverFormat } from "@/components/ui/product-cover";
import type { ProductType } from "@/types/product";
import { cn } from "@/lib/utils";

interface ServiceVisualProps {
  imageUrl?: string | null;
  alt: string;
  type: ProductType;
  title: string;
  subtitle?: string | undefined;
  format?: ProductCoverFormat;
  className?: string;
}

/**
 * Photograph with a branded fallback.
 *
 * DESIGN.md requires that a failed image still leaves a meaningful card, so a
 * load error swaps in the generated cover rather than leaving a broken frame.
 */
export function ServiceVisual({
  imageUrl,
  alt,
  type,
  title,
  subtitle,
  format = "landscape",
  className,
}: ServiceVisualProps) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <ProductCover
        type={type}
        title={title}
        subtitle={subtitle}
        format={format}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-neutral-100",
        format === "landscape" && "aspect-video",
        format === "portrait" && "aspect-[2/3]",
        format === "square" && "aspect-square",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}