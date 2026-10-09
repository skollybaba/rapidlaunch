"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { formatPrice } from "@/lib/utils";

type NumberFormat = "int" | "price";

interface AnimatedNumberProps {
  value: number;
  format?: NumberFormat;
  currency?: string;
  durationMs?: number;
  className?: string;
}

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function render(kind: NumberFormat, value: number, currency: string) {
  return kind === "price"
    ? formatPrice(value, currency)
    : Math.round(value).toLocaleString("en-NG");
}

/**
 * Counts a number up to its value on mount. Server-renders the final value so
 * it is correct without JavaScript; the layout effect rewinds to zero before
 * the first paint (no flash) and eases to the target. Honours reduced motion.
 */
export function AnimatedNumber({
  value,
  format = "int",
  currency = "NGN",
  durationMs = 900,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === 0) return;

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = render(format, value * eased, currency);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    node.textContent = render(format, 0, currency);
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [value, format, currency, durationMs]);

  return (
    <span ref={ref} className={className}>
      {render(format, value, currency)}
    </span>
  );
}
