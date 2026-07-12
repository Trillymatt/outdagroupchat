"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatedTabs, type TabItem } from "@/components/ui/tabs";

export function TripTabsNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/trips/${tripId}`;

  const items: TabItem[] = [
    { key: "overview", label: "Overview", href: `${base}/overview` },
    { key: "itinerary", label: "Itinerary", href: `${base}/itinerary` },
    { key: "lodging", label: "Lodging", href: `${base}/lodging` },
    { key: "food", label: "Food", href: `${base}/food` },
    { key: "flights", label: "Flights", href: `${base}/flights` },
    { key: "budget", label: "Budget", href: `${base}/budget` },
    { key: "documents", label: "Documents", href: `${base}/documents` },
    { key: "expenses", label: "Expenses", href: `${base}/expenses` },
    { key: "assistant", label: "Assistant", href: `${base}/assistant` },
    { key: "settings", label: "Settings", href: `${base}/settings` },
  ];

  const active = items.find((item) => pathname?.startsWith(item.href))?.key ?? "overview";

  return (
    <>
      <label className="block sm:hidden">
        <span className="sr-only">Trip section</span>
        <select
          value={items.find((item) => item.key === active)?.href}
          onChange={(event) => router.push(event.target.value)}
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base font-medium text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/15"
        >
          {items.map((item) => (
            <option key={item.key} value={item.href}>{item.label}</option>
          ))}
        </select>
      </label>
      <div className="hidden sm:block">
        <AnimatedTabs items={items} activeKey={active} layoutId={`trip-tabs-${tripId}`} />
      </div>
    </>
  );
}
