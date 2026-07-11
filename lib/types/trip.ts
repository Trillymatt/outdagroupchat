import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type TripMember = Database["public"]["Tables"]["trip_members"]["Row"];
export type Flight = Database["public"]["Tables"]["flights"]["Row"];
export type LodgingOption = Database["public"]["Tables"]["lodging_options"]["Row"];
export type ItineraryItem = Database["public"]["Tables"]["itinerary_items"]["Row"];
export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];
export type FlightSuggestion = Database["public"]["Tables"]["flight_suggestions"]["Row"];
export type AiSuggestion = Database["public"]["Tables"]["ai_suggestions"]["Row"];
export type PackingItem = Database["public"]["Tables"]["packing_items"]["Row"];
export type TripDocument = Database["public"]["Tables"]["trip_documents"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseSplit = Database["public"]["Tables"]["expense_splits"]["Row"];
// Named TripComment (not Comment) to avoid colliding with the DOM `Comment` type.
export type TripComment = Database["public"]["Tables"]["comments"]["Row"];
export type ActivityEvent = Database["public"]["Tables"]["activity_events"]["Row"];
export type TripLeg = Database["public"]["Tables"]["trip_legs"]["Row"];

export type TripMemberWithProfile = TripMember & {
  profile: Pick<Profile, "id" | "name" | "avatar_color">;
};

export type TripWithMembers = Trip & {
  trip_members: TripMemberWithProfile[];
};

export type LodgingOptionWithVotes = LodgingOption & {
  lodging_votes: { user_id: string }[];
};

export type RestaurantWithVotes = Restaurant & {
  restaurant_votes: { user_id: string }[];
};

export type ItineraryItemWithAuthor = ItineraryItem & {
  author?: Pick<Profile, "id" | "name" | "avatar_color">;
};

export function tripStatusLabel(trip: TripWithMembers): "upcoming" | "active" | "past" {
  if (!trip.start_date || !trip.end_date) return "upcoming";
  const now = new Date();
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  end.setHours(23, 59, 59, 999);
  if (now < start) return "upcoming";
  if (now > end) return "past";
  return "active";
}
