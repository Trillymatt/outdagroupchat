"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  key: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export function AnimatedTabs({
  items,
  activeKey,
  layoutId,
}: {
  items: TabItem[];
  activeKey: string;
  layoutId: string;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            ref={active ? activeRef : undefined}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active ? "text-white" : "text-ink-soft hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-full bg-sync-gradient"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
