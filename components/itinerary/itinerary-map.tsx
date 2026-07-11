"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { createClient } from "@/lib/supabase/client";
import { formatDay } from "@/lib/utils/dates";
import type { ItineraryItem } from "@/lib/types/trip";

const LIBRARIES: "places"[] = ["places"];

// One color per trip day, cycling if the trip is longer than the palette
const DAY_COLORS = ["#16A34A", "#2563EB", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#65A30D"];

function dayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

function numberedIcon(color: string, label: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><circle cx="13" cy="13" r="11" fill="${color}" stroke="#fff" stroke-width="2"/><text x="13" y="17" font-size="12" font-family="system-ui" font-weight="600" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: typeof google !== "undefined" ? new google.maps.Size(26, 26) : undefined,
    anchor: typeof google !== "undefined" ? new google.maps.Point(13, 13) : undefined,
  };
}

export function ItineraryMap({ items, days }: { items: ItineraryItem[]; days: string[] }) {
  const requested = useRef(new Set<string>());
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({ id: "tandem-google-maps", googleMapsApiKey: apiKey ?? "", libraries: LIBRARIES });

  // Items created before the map existed (or whose geocode failed mid-save) get
  // coords lazily here; realtime UPDATE events drop the pins in as they resolve.
  useEffect(() => {
    const pending = items.filter((i) => i.location && i.lat == null && !requested.current.has(i.id));
    if (pending.length === 0) return;
    const supabase = createClient();
    for (const item of pending) {
      requested.current.add(item.id);
      fetch(`/api/geocode?q=${encodeURIComponent(item.location!)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(async (coords: { lat: number | null; lng: number | null } | null) => {
          if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
            await supabase.from("itinerary_items").update({ lat: coords.lat, lng: coords.lng }).eq("id", item.id);
          }
        })
        .catch(() => {});
    }
  }, [items]);

  const located = useMemo(
    () =>
      [...items]
        .filter((i) => i.lat != null && i.lng != null)
        .sort((a, b) => (a.day === b.day ? a.position - b.position : a.day.localeCompare(b.day))),
    [items],
  );

  const dayIndex = useMemo(() => new Map(days.map((d, i) => [d, i])), [days]);

  const byDay = useMemo(() => {
    const map = new Map<string, ItineraryItem[]>();
    for (const item of located) map.set(item.day, [...(map.get(item.day) ?? []), item]);
    return map;
  }, [located]);

  const points = useMemo(() => located.map((i) => ({ lat: i.lat!, lng: i.lng! })), [located]);
  const unlocated = items.filter((i) => i.location && i.lat == null).length;
  const noLocation = items.filter((i) => !i.location).length;

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      if (points.length === 0) return;
      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(13);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 48);
    },
    [points],
  );

  if (points.length === 0) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-center">
        <p className="font-medium text-ink">Nothing to map yet</p>
        <p className="max-w-sm text-sm text-ink-soft">
          {unlocated > 0
            ? "Finding locations… pins appear as soon as they're geocoded."
            : "Add a location to your itinerary items and they'll show up here."}
        </p>
      </div>
    );
  }

  if (!apiKey || !isLoaded) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-center">
        <p className="font-medium text-ink">Map isn&apos;t configured yet</p>
        <p className="max-w-sm text-sm text-ink-soft">Add a Google Maps API key to see itinerary stops plotted on a map.</p>
      </div>
    );
  }

  const activeItem = located.find((i) => i.id === activeMarker) ?? null;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-line">
        <GoogleMap mapContainerStyle={{ height: 480, width: "100%" }} onLoad={onMapLoad} options={{ streetViewControl: false, mapTypeControl: false }}>
          {Array.from(byDay.entries()).map(([day, dayItems]) => {
            const color = dayColor(dayIndex.get(day) ?? 0);
            return (
              <Fragment key={day}>
                {dayItems.length > 1 && (
                  <Polyline
                    path={dayItems.map((i) => ({ lat: i.lat!, lng: i.lng! }))}
                    options={{ strokeColor: color, strokeWeight: 2.5, strokeOpacity: 0.6 }}
                  />
                )}
                {dayItems.map((item, idx) => (
                  <Marker
                    key={item.id}
                    position={{ lat: item.lat!, lng: item.lng! }}
                    icon={numberedIcon(color, idx + 1)}
                    onClick={() => setActiveMarker(item.id)}
                  />
                ))}
              </Fragment>
            );
          })}
          {activeItem && (
            <InfoWindow position={{ lat: activeItem.lat!, lng: activeItem.lng! }} onCloseClick={() => setActiveMarker(null)}>
              <div style={{ minWidth: 140 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{activeItem.title}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>
                  {formatDay(activeItem.day)}
                  {activeItem.time ? ` · ${activeItem.time.slice(0, 5)}` : ""}
                </p>
                {activeItem.location && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>{activeItem.location}</p>}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {Array.from(byDay.keys()).map((day) => (
          <span key={day} className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dayColor(dayIndex.get(day) ?? 0) }} />
            {formatDay(day)}
          </span>
        ))}
        {(unlocated > 0 || noLocation > 0) && (
          <span className="text-xs text-ink-soft/70">
            {unlocated > 0 && `${unlocated} still locating`}
            {unlocated > 0 && noLocation > 0 && " · "}
            {noLocation > 0 && `${noLocation} without a location`}
          </span>
        )}
      </div>
    </div>
  );
}
