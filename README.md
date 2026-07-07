# Tandem

A shared "mission control" for group trip planning. Create or join a trip, and everyone in the group chat can
plan itinerary, lodging, food, flights, and budget together in one place, live.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Supabase (Postgres, Auth, Realtime)
- Anthropic API (Claude) for AI suggestions
- Twilio for SMS notifications
- Deployed on Vercel

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `supabase/migrations/20250101000000_init.sql`. This creates every
   table, Row Level Security policy, and the `create_trip` / `join_trip_by_code` / `leave_trip` /
   `remove_trip_member` / `delete_trip` RPC functions the app calls.
   - If you use the Supabase CLI instead: `supabase db push` (with the project linked) applies the same file.
3. In **Authentication → Providers → Email**, decide whether to require email confirmation. If you leave it on
   (the default), a new signup won't get a session until they click the confirmation email — the signup form
   already handles this by showing a "check your email" message instead of redirecting. Turning it off gives
   instant signup, which is friendlier for a quick group-trip setup.
4. Grab **Project Settings → API → Project URL** and **anon public key** for the next step.

## 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- `ANTHROPIC_API_KEY` powers every AI feature (itinerary/restaurant suggestions, packing list, budget check,
  catch-me-up). Optionally set `ANTHROPIC_MODEL` to override the default model (`claude-opus-4-8`).
- Twilio vars are optional — if unset, `sendSms` logs a warning and no-ops instead of throwing, so the rest of
  the app works fine without SMS configured. Get these from the [Twilio Console](https://console.twilio.com):
  an Account SID, an Auth Token, and a phone number capable of sending SMS.

## 3. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on `/login` — sign up, create a trip, and share
the invite code with the rest of your group (or open a second browser/incognito window to simulate a second
member joining).

## How it's organized

- `supabase/migrations/` — the full schema: `profiles`, `trips`, `trip_members`, `flights`, `lodging_options` (+
  `lodging_votes`), `itinerary_items`, `restaurants` (+ `restaurant_votes`), `ai_suggestions`, `packing_items` (+
  `packing_item_checks`), `trip_date_proposals` (+ `trip_date_votes`) — all with RLS scoped to trip membership.
- `lib/supabase/` — browser client, server client, and the Next.js middleware that refreshes the auth session.
- `lib/hooks/use-realtime-list.ts` — the shared realtime pattern every tab uses: subscribe to Postgres changes
  for a trip's rows and keep local state in sync live, no refresh needed.
- `lib/ai/client.ts` — the one place the Anthropic SDK is called (server-side only); each AI feature under
  `app/api/ai/*` has its own small, scoped prompt and Zod output schema rather than one do-everything prompt.
- `components/ui/` — the design system (Button, Card, Avatar, Badge, Input, tabs, the animated route-line motif).
- `app/(app)/trips/[tripId]/` — the per-trip tabs: overview, itinerary, lodging, food, flights, budget, assistant.

## Notes / known limitations

- Flights are Phase 1 (manual entry + a Google Flights deep link) per the build plan — no live flight-search API
  integration yet.
- Budget assumes lodging and miscellaneous itinerary costs split evenly across current trip members; flights are
  always per-person since each member enters their own.
- SMS notifications fire on two events (a new member joining, and trip dates getting locked in) plus a manual
  "send test text" button in Account settings — this demonstrates the Twilio integration without trying to cover
  every possible trigger.
- Next.js 16 prints a deprecation warning for `middleware.ts` in favor of a new `proxy.ts` convention; middleware
  still works correctly, this just hasn't been migrated yet.

## Deploying

Push to a Git repo and import it in Vercel, or run `vercel`. Add the same environment variables from step 2 in
the Vercel project settings. No other configuration is needed — there's no build step beyond the standard
`next build`.
