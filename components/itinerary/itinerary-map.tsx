"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { formatDay } from "@/lib/utils/dates";
import type { ItineraryItem } from "@/lib/types/trip";

// One color per trip day, cycling if the trip is longer than the palette
const DAY_COLORS = ["#16A34A", "#2563EB", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#65A30D"];

function dayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

function numberedIcon(color: string, label: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};color:#fff;font:600 12px/1 system-ui;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(points).pad(0.2));
    }
  }, [map, points]);
  return null;
}

export function ItineraryMap({ items, days }: { items: ItineraryItem[]; days: string[] }) {
  const requested = useRef(new Set<string>());

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

  const points = useMemo(() => located.map((i) => [i.lat!, i.lng!] as [number, number]), [located]);
  const unlocated = items.filter((i) => i.location && i.lat == null).length;
  const noLocation = items.filter((i) => !i.location).length;

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

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-line">
        <MapContainer center={points[0]} zoom={12} style={{ height: 480, width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          {Array.from(byDay.entries()).map(([day, dayItems]) => {
            const color = dayColor(dayIndex.get(day) ?? 0);
            return (
              <Fragment key={day}>
                {dayItems.length > 1 && (
                  <Polyline
                    positions={dayItems.map((i) => [i.lat!, i.lng!] as [number, number])}
                    pathOptions={{ color, weight: 2.5, opacity: 0.6, dashArray: "6 6" }}
                  />
                )}
                {dayItems.map((item, idx) => (
                  <Marker key={item.id} position={[item.lat!, item.lng!]} icon={numberedIcon(color, idx + 1)}>
                    <Popup>
                      <div style={{ minWidth: 140 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{item.title}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>
                          {formatDay(item.day)}
                          {item.time ? ` · ${item.time.slice(0, 5)}` : ""}
                        </p>
                        {item.location && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>{item.location}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </Fragment>
            );
          })}
        </MapContainer>
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
