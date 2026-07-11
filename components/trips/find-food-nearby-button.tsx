"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export function FindFoodNearbyButton({
  tripId,
  lat,
  lng,
  label,
}: {
  tripId: string;
  lat: number;
  lng: number;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function findFood() {
    setLoading(true);
    try {
      await fetch("/api/ai/food-near", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, lat, lng, label }),
      });
    } finally {
      setLoading(false);
      router.push(`/trips/${tripId}/food`);
    }
  }

  return (
    <button
      type="button"
      onClick={findFood}
      disabled={loading}
      className="flex items-center gap-1 text-xs font-medium text-green-dark transition-opacity hover:underline disabled:opacity-60"
    >
      <Sparkles className="h-3 w-3" />
      {loading ? "Finding food nearby…" : "Find food nearby"}
    </button>
  );
}
