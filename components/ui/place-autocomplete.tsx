"use client";

import { useRef } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";

const LIBRARIES: "places"[] = ["places"];

export interface PlaceSelection {
  description: string;
  lat: number;
  lng: number;
  placeId: string;
}

/**
 * Google Places autocomplete text field. Degrades to a plain text input
 * with no autocomplete when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY isn't set —
 * same graceful-degradation contract as the other optional integrations
 * (Amadeus, Anthropic, Unsplash, Twilio).
 */
export function PlaceAutocomplete({
  id,
  name,
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  autoFocus,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceSelection) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "tandem-google-maps",
    googleMapsApiKey: apiKey ?? "",
    libraries: LIBRARIES,
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  function handlePlaceChanged() {
    const place = autocompleteRef.current?.getPlace();
    const location = place?.geometry?.location;
    if (!location) return;
    const description = place?.formatted_address ?? place?.name ?? value;
    onChange(description);
    onPlaceSelect?.({ description, lat: location.lat(), lng: location.lng(), placeId: place?.place_id ?? "" });
  }

  const input = (
    <Input
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoComplete="off"
    />
  );

  if (!apiKey || !isLoaded) return input;

  return (
    <Autocomplete onLoad={(a) => (autocompleteRef.current = a)} onPlaceChanged={handlePlaceChanged}>
      {input}
    </Autocomplete>
  );
}
