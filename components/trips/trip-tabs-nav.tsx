"use client";

import { usePathname } from "next/navigation";
import { AnimatedTabs, type TabItem } from "@/components/ui/tabs";

export function TripTabsNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  const items: TabItem[] = [
    { key: "overview", label: "Overview", href: `${base}/overview` },
    { key: "itinerary", label: "Itinerary", href: `${base}/itinerary` },
    { key: "lodging", label: "Lodging", href: `${base}/lodging` },
    { key: "food", label: "Food", href: `${base}/food` },
    { key: "flights", label: "Flights", href: `${base}/flights` },
    { key: "budget", label: "Budget", href: `${base}/budget` },
    { key: "documents", label: "Documents", href: `${base}/documents` },
    { key: "assistant", label: "Assistant", href: `${base}/assistant` },
  ];

  const active = items.find((item) => pathname?.startsWith(item.href))?.key ?? "overview";

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <AnimatedTabs items={items} activeKey={active} layoutId={`trip-tabs-${tripId}`} />
    </div>
  );
}
