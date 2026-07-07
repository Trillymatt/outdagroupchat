"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-sync-gradient text-white shadow-[0_8px_24px_-8px_rgba(31,95,66,0.5)]",
  secondary: "bg-surface text-ink border border-line hover:border-green/60",
  ghost: "bg-transparent text-ink-soft hover:text-ink hover:bg-ink/5",
  danger: "bg-danger text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-sm px-3 py-1.5 gap-1.5 rounded-full",
  md: "text-sm px-4 py-2.5 gap-2 rounded-full",
  lg: "text-base px-6 py-3 gap-2 rounded-full",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { y: -1 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
