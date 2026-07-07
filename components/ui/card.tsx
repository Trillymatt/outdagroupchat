"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-3xl border border-line bg-surface p-5", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const HoverCard = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={{ y: -4, boxShadow: "0 20px 40px -20px rgba(20,18,31,0.25)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("rounded-3xl border border-line bg-surface p-5", className)}
      {...props}
    />
  ),
);
HoverCard.displayName = "HoverCard";
