import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonTheme = "light" | "dark";

interface ButtonOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  theme?: ButtonTheme;
  className?: string;
}

export const baseButton =
  "inline-flex items-center justify-center gap-2 rounded-pill font-sans font-semibold transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, Record<ButtonTheme, string>> = {
  primary: {
    light: "bg-terracotta-600 text-white hover:bg-terracotta-500",
    dark: "bg-terracotta-600 text-white hover:bg-terracotta-500",
  },
  secondary: {
    light:
      "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100",
    dark: "border border-white/30 bg-transparent text-white hover:bg-white/10",
  },
  ghost: {
    light: "text-terracotta-600 hover:text-terracotta-500",
    dark: "text-neutral-100 hover:text-white",
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] px-6 text-sm",
};

export function buttonStyles(options: ButtonOptions = {}): string {
  const {
    variant = "primary",
    size = "md",
    theme = "light",
    className,
  } = options;
  return cn(
    baseButton,
    variantClasses[variant][theme],
    sizeClasses[size],
    className
  );
}

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<ButtonOptions, "className"> {}

export function Button({
  variant = "primary",
  size = "md",
  theme = "light",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, theme, className })}
      {...props}
    />
  );
}