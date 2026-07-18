# Tandem — Design & Product Spec (for native iOS/SwiftUI rebuild)

> **Purpose of this document**: a complete, read-only audit of the Tandem web app (Next.js 16 + Supabase) so a
> parallel native iOS build can match its look, feel, information architecture, data model, and behavior. Nothing
> in the source repo was modified to produce this document.
>
> **What Tandem is**: a shared "mission control" for group trip planning. A group creates or joins a trip via an
> invite code, then plans itinerary, lodging, food, flights, budget, expenses, and documents together, live.

**Stack (web reference implementation)**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, Supabase
(Postgres + Auth + Realtime + Storage), Anthropic Claude API for AI suggestions, Google Maps/Places JS API,
Amadeus flight-search API, Unsplash API, Twilio SMS, `@react-pdf/renderer` for PDF export, `framer-motion` for
animation, `@dnd-kit` for drag-and-drop.

---

## 1. Design system

### 1.1 Color palette

Tailwind v4 is configured entirely in CSS (`app/globals.css`) via `@theme inline` — there is no
`tailwind.config.js`. Colors are CSS custom properties on `:root` (light) and `.dark` (dark), swapped by toggling
a `.dark` class on `<html>`. Theme preference is read from `localStorage["theme"]` before first paint (an inline
`<script>` in the root layout); it defaults to **dark** when nothing is stored.

| Token | Purpose | Light hex | Dark hex |
|---|---|---|---|
| `--color-paper` | App background (page canvas) | `#f4f4fb` | `#0a0f0c` |
| `--color-surface` | Elevated surface (cards, header, menus, inputs) | `#ffffff` | `#131a16` |
| `--color-ink` | Primary text | `#14121f` | `#eef2f0` |
| `--color-ink-soft` | Secondary / muted text | `#4a4760` | `#94a39b` |
| `--color-line` | Borders, dividers | `#e3e1f2` | `#223028` |
| `--color-green` | Primary brand accent (buttons, links, active states) | `#1f5f42` | `#4f9d75` |
| `--color-green-dark` | Deeper accent — link text, emphasis on light backgrounds | `#16442f` | `#7ab896` |
| `--color-teal` | Secondary accent (gradient midpoint) | `#0f766e` | `#4a8f89` |
| `--color-lime` | Tertiary accent (gradient end) | `#7c8f4a` | `#9caf6b` |
| `--color-success` | Success state (booked, settled up, confirmations) | `#1fb17a` | `#34d399` |
| `--color-warning` | Warning state (opted out, "still open" items) | `#e8973a` | `#f0a94e` |
| `--color-danger` | Destructive / error state | `#ef4b6b` | `#f5748c` |

**Brand gradient** — used for the primary CTA button, active tab pill, logo mark, decorative route line, and the
budget "trip total" headline text:
```
linear-gradient(100deg, var(--color-green) 0%, var(--color-teal) 55%, var(--color-lime) 100%)
```
Applied as `.bg-sync-gradient` (background) and `.text-sync-gradient` (gradient clipped to text, `background-clip:
text` + `color: transparent`).

**Selection color**: `::selection` is `background: var(--color-green); color: white` in both themes.

Colors are consumed as Tailwind utilities generated from the theme tokens: `bg-paper`, `bg-surface`, `text-ink`,
`text-ink-soft`, `border-line`, `bg-green`, `text-green-dark`, `bg-success`, `text-warning`, `text-danger`, etc.,
plus opacity modifiers everywhere (`bg-green/10`, `text-ink-soft/60`, `border-line/70`, `ring-green/40`, `bg-ink/5`
for hover overlays on surfaces).

**Semantic color usage patterns** (for mapping to SwiftUI semantic colors):
- `ink/5` through `ink/10` — subtle hover/active tint on any surface (dark-mode-safe since `ink` itself flips).
- Badges use tone-based backgrounds at 10% opacity with full-opacity text of the same hue: neutral (`ink/5` +
  `ink-soft`), green, success, warning, danger.
- Status colors: flight/lodging "booked" → success; "searching"/"proposed" → neutral; "opted out" → warning.

### 1.2 Typography

- **Font families**: [Geist Sans](https://vercel.com/font) for UI text, **Geist Mono** for monospaced content
  (invite codes, confirmation numbers). Loaded via `next/font/google`, exposed as CSS vars `--font-geist-sans` /
  `--font-geist-mono`, mapped to Tailwind's `--font-sans` / `--font-mono`. Fallback stack:
  `Arial, Helvetica, sans-serif`.
- **No custom type scale** — Tailwind's default `text-*` scale is used unmodified:
  - `text-xs` (12px) — timestamps, meta text, badges, comment bodies, eyebrow labels.
  - `text-sm` (14px) — default body copy, descriptions, form labels' sibling text, most card text.
  - `text-base` (16px) — form inputs (prevents iOS zoom-on-focus), invite code display.
  - `text-lg` (18px) — auth card headings, logo wordmark.
  - `text-xl` (20px) — sub-section headings ("Search & suggest flights"), profile page name.
  - `text-2xl` (24px) — page-level `<h1>` on every route ("Mission control", "Itinerary", "Budget", etc.).
  - `text-4xl` (36px) — the single largest text in the app: the Budget page's "Trip total" figure, rendered with
    the brand gradient (`text-sync-gradient`).
- **Weights**: `font-medium` (500) is the default for anything emphasized (names, titles, buttons, nav links);
  `font-semibold` (600) for headings and card titles. Plain `font-normal`/no weight class for de-emphasized
  inline text. Bold (700) is not used anywhere in the UI.
- **Tracking**: `tracking-tight` on all page/card headings; `tracking-wide` on uppercase eyebrow labels (e.g.
  "UPCOMING", section dividers); wider custom tracking (`tracking-[0.18em]`, `tracking-[0.24em]`,
  `tracking-[0.3em]`, `tracking-widest`) specifically for invite codes and the "Trip invitation" eyebrow — a
  spaced-out, code-like treatment.
- **Recurring text patterns**:
  - Page header: `text-2xl font-semibold tracking-tight` (h1) + `text-sm text-ink-soft` (subhead), stacked with a
    small gap, at the top of every trip tab and every top-level page.
  - Section eyebrow: `text-sm font-semibold uppercase tracking-wide text-ink-soft` (e.g. "Upcoming", "Booked",
    "Proposed", "Settle up").
  - Card title: `font-semibold text-ink` (no explicit size = inherits `text-base`/16px, or `text-sm` inside
    denser cards).
  - Meta/caption: `text-xs text-ink-soft`, often with a `·` (middle dot) separator between clauses.

### 1.3 Spacing & sizing

No custom spacing scale — Tailwind v4's default (4px base unit, `0.25rem` steps) is used as-is throughout. Common
values observed: `p-1`/`p-1.5`/`p-2`/`p-2.5`/`p-3`/`p-3.5` for compact controls; `p-4`/`p-5` for card padding;
`p-6`/`p-8` for hero/empty-state blocks. Vertical rhythm between sections is almost always `space-y-4`,
`space-y-5`, or `space-y-6`.

- **Page container**: `mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6` (the `<main>` in the authenticated app shell).
- **Narrow content pages** (settings, account, public profile): `mx-auto max-w-2xl` or `max-w-lg`.
- **Card default padding**: `p-4 sm:p-5`.
- **Responsive breakpoint usage**: overwhelmingly `sm:` (640px) as the mobile→desktop cutover, with occasional
  `md:`/`lg:`/`xl:` for grid column counts (e.g. itinerary board `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`,
  trip cards `sm:grid-cols-2 lg:grid-cols-3`).
- **Touch targets**: many interactive elements enforce `min-h-10`/`min-h-11` (40–44px) on mobile via responsive
  classes like `min-h-11 sm:min-h-9`, meeting iOS-style minimum tap-target sizing even though this is a web app.

### 1.4 Border radius

A consistent, generous-radius "soft" visual language — nothing in the app uses a sharp (0–4px) corner:

| Radius | Value | Used for |
|---|---|---|
| `rounded-lg` | 8px | Small icon-only buttons, nested tag chips |
| `rounded-xl` | 12px | AI section cards, tab-switcher wrapper, small link-preview thumbnails, compact rows |
| `rounded-2xl` | 16px | **The dominant radius** — inputs, list item rows (itinerary/lodging/food/expense/document cards), inner content blocks, cover photo frames |
| `rounded-3xl` | 24px | The `Card` primitive itself (every top-level card in the app), the dashboard hero banner, empty states |
| `rounded-full` | pill/circle | Buttons, badges, avatars, the tab nav pill, switches, invite-code chip, progress pills |

### 1.5 Shadows / elevation

The app is otherwise flat (cards are distinguished by a 1px `border-line` border and a slightly different
background, not shadow), so shadows are reserved for a few specific moments of emphasis:

- **Primary button**: `shadow-[0_8px_24px_-8px_rgba(31,95,66,0.5)]` — a soft green glow under the CTA, using the
  brand gradient's own hue rather than a neutral shadow.
- **Card hover** (`HoverCard`, used for trip dashboard cards): animates from no shadow to
  `0 20px 40px -20px rgba(20,18,31,0.25)` combined with a `-4px` Y translate — the card visibly lifts.
  `AiSectionCard` gets a lighter version on hover: `shadow-[0_10px_30px_-24px_rgba(20,18,31,0.45)]`.
  Overlay/menu surfaces (mobile nav dropdown) use plain Tailwind `shadow-xl`.
- **Dragging state** (itinerary item being reordered): `shadow-[0_16px_32px_-16px_rgba(20,18,31,0.35)]` plus a
  `ring-2 ring-green/40` outline — the dragged card visually detaches and gets a green focus ring.

### 1.6 Motion & interaction patterns

All animation is done with `framer-motion` (springs, not durations, for anything physical) plus a couple of raw
CSS `@keyframes`. Describing the *effect*, not the code:

- **Buttons** — every button nudges up 1px and slightly shrinks (scale 0.97) on press, spring-damped so it feels
  snappy rather than linear. This is the app's signature "tactile" micro-interaction and appears on literally
  every `Button` instance.
- **Cards that can be tapped** (trip dashboard cards) — lift up and gain a soft shadow on hover/press, like the
  card is peeling off the page slightly.
- **List items appearing/disappearing** — itinerary items, lodging options, restaurant cards, expense rows,
  flight suggestions, and documents all fade in while sliding up ~8px when added, and fade out while sliding up
  when removed, with the surrounding list smoothly reflowing to close the gap (a "layout" animation, not an
  instant jump). This happens on every add/delete across the whole app — it's the single most repeated motion
  pattern.
- **Tab switching** (both the top-level trip tab bar and the board/map toggle) — the active tab's colored pill
  background doesn't fade in from nothing; it *slides/morphs* from wherever it previously was to the newly
  active tab, like a shared physical object moving between slots.
- **Toggle switches** — the thumb slides left/right with a springy overshoot rather than a linear slide.
- **Comment threads** — expanding a collapsed comment thread animates its height open (accordion-style) rather
  than snapping; collapsing reverses it.
- **AI suggestion cards** (packing list, catch-me-up, itinerary/restaurant suggestions) — the "Show/Hide" content
  area expands/collapses with a smooth height animation; the whole card has a subtle shadow lift on hover to
  signal it's a distinct "AI" surface from ordinary content cards.
- **Drag-to-reorder** (itinerary items within a day) — a drag handle (grip icon) picks up an item after ~4px of
  pointer movement; while dragging, the item gets a shadow + green ring and other items in the column
  shift out of the way live to preview the drop position.
- **Decorative route line** — a dashed SVG path (used behind the dashboard hero and behind the auth-page header)
  has its dash offset animated infinitely, so the dashed line appears to be perpetually "traveling" along the
  route, evoking a flight/travel path. A second keyframe (`float`, a slow 6px vertical bob) is defined in the
  theme but is not currently applied to anything in the current codebase — it exists as a reserved utility.
- **Loading states** — three distinct patterns depending on context: (1) skeleton pulse blocks (`animate-pulse`)
  for link-preview cards and the map while data loads; (2) a spinning icon (`Loader2`) for file-upload buttons;
  (3) button label text swapping to a present-participle phrase ("Thinking…", "Searching…", "Saving…",
  "Uploading…", "Creating account…") with the button disabled, rather than a separate spinner overlay.
- **Theme transition**: switching light/dark cross-fades background and text color over 0.2s rather than
  snapping instantly.
- Mobile-only: tap-highlight color is stripped on buttons/links/inputs (`-webkit-tap-highlight-color: transparent`)
  for a native-feeling tap without the gray flash.

---

## 2. Information architecture

### 2.1 Route map

All authenticated app routes live under an `(app)` layout that requires a Supabase session (redirects to
`/login` otherwise) and renders the persistent header. All auth routes live under a separate `(auth)` layout
(centered card, no header, decorative route-line backdrop).

| Route | Auth required | Purpose |
|---|---|---|
| `/` | — | Redirects to `/dashboard` if signed in, else `/login`. |
| `/login` | No | Sign in form. Accepts `?redirect=` to return to a deep link (e.g. an invite) after auth. |
| `/signup` | No | Create account (name, email, password, optional phone for SMS opt-in). Shows a "check your email" state if email confirmation is enabled server-side, otherwise signs in immediately. |
| `/forgot-password` | No | Request a password-reset email. |
| `/reset-password` | No (needs valid recovery session) | Set a new password after following the emailed reset link. |
| `/auth/confirm` | No | Route handler (not a page) that exchanges a Supabase email-confirmation/recovery token for a session, then redirects onward (`?next=`). |
| `/join/[code]` | No (page adapts) | Public invite-link landing page. Signed-out users see a branded "You're invited" card with Sign in / Create account CTAs (invite code preserved through the auth redirect chain). Signed-in users are immediately routed through the join-request flow and shown either "Request sent" or an invalid-code error. |
| `/dashboard` | Yes | **Home/mission control.** Lists every trip the user belongs to, split into "Upcoming" and "Past" sections, as a card grid. Hero banner with "Create a trip" / "Join with code" CTAs. |
| `/trips/new` | Yes | Create-trip form (name, destination w/ Places autocomplete, optional start/end dates, optional trip-preference quiz). |
| `/trips/join` | Yes | Manual invite-code entry (alternative to the `/join/[code]` link flow). |
| `/trips/[tripId]` | Yes | Redirects to `/trips/[tripId]/overview`. |
| `/trips/[tripId]/overview` | Yes | Trip details (name/destination/dates/cover photo), multi-city "legs" editor, group date-availability voting + "lock dates", export shortcuts (PDF/ICS), and a live activity feed — two-column layout on desktop. |
| `/trips/[tripId]/itinerary` | Yes | Day-by-day itinerary board (or a map view), with AI activity suggestions. |
| `/trips/[tripId]/lodging` | Yes | Propose/vote on places to stay; booked vs. proposed sections. |
| `/trips/[tripId]/food` | Yes | Propose/vote on restaurants; AI restaurant suggestions; schedule a restaurant onto the itinerary. |
| `/trips/[tripId]/flights` | Yes | Personal per-member flight tracker (one card per member) plus a shared flight-search-and-suggest board (Amadeus-backed). |
| `/trips/[tripId]/budget` | Yes | Read-only computed summary: trip total broken into flights/lodging/itinerary, and a per-person breakdown. |
| `/trips/[tripId]/documents` | Yes | Drag-and-drop file vault (confirmations, tickets, receipts) backed by Supabase Storage. |
| `/trips/[tripId]/expenses` | Yes | Expense ledger with even-split logic, net balances, and minimal "who owes whom" settlement suggestions. |
| `/trips/[tripId]/assistant` | Yes | A single page collecting all four AI helper widgets (itinerary suggestions, restaurant suggestions, packing list, catch-me-up) so they're discoverable in one place, in addition to appearing inline on their respective tabs. |
| `/trips/[tripId]/settings` | Yes | Invite code + share sheet, pending join requests (owner only), member list + per-member permission toggles (owner only), personal trip-preferences quiz, mark-trip-completed toggle (owner only), danger zone / delete trip (owner only). |
| `/account` | Yes | Profile picture upload, name/email display, phone number + SMS opt-in, "send test text" button. |
| `/u/[userId]` | Yes | Public-ish profile page: any signed-in user can view another user's name/avatar and their completed-trip history (via a narrow `SECURITY DEFINER` RPC, not the general trips table). |

Route-level API handlers (no UI): `/api/ai/*` (5 AI endpoints, see §4), `/api/flights/search`, `/api/geocode`,
`/api/images/city-photo`, `/api/link-preview` + `/api/link-preview/image` (proxy), `/api/trips/[tripId]/export`
(PDF), `/api/trips/[tripId]/calendar` (ICS).

### 2.2 Navigation structure

- **Global header** (`AppHeader`, sticky, translucent/blurred `bg-paper/80 backdrop-blur`): logo (left) → "My
  trips" link, theme toggle, avatar-as-account-link, sign-out — on desktop as an inline row; on mobile collapsed
  into a `<details>`-based dropdown menu triggered by a hamburger icon in a circular button.
- **Trip-level navigation** (`TripTabsNav`, rendered by the `[tripId]` layout above every trip page): a
  **pill-shaped segmented tab bar** with 10 tabs (Overview, Itinerary, Lodging, Food, Flights, Budget, Documents,
  Expenses, Assistant, Settings) — horizontally scrollable if it overflows, with the active tab highlighted by
  the sliding gradient pill described in §1.6. **On mobile this entire bar is replaced by a native `<select>`
  dropdown** styled as a rounded input — i.e., the tab bar UI itself changes shape at the `sm:` breakpoint rather
  than just shrinking, which is a strong signal for how the iOS nav should adapt (e.g. a picker/menu rather than
  a horizontally-scrolling tab strip on compact width, or a bottom tab bar if width allows more items).
  Immediately below the tabs, every trip page renders its own local `<h1>` + one-line description before content.
- **Trip header** (`TripHeader`, above the tabs): trip name, destination · date range, and a stacked avatar group
  of all members — present on every trip sub-page via the shared `[tripId]` layout.
- Breadcrumb-style back-navigation doesn't exist as a distinct component; the trip header + tabs together serve
  that role (users navigate trip → tab via the tab bar, and back to the dashboard via the header logo or "My
  trips" link).

### 2.3 Key UI components (structure, not code)

- **Trip card** (`TripCard`, dashboard grid): a `HoverCard` — cover photo (if any) bleeding to the card's edges,
  trip name, destination, date range in accent color, and a footer row with a stacked avatar group of members
  plus (if any flights exist) a small pill showing "X/Y flights booked" with a mini progress bar.
- **Itinerary board**: a Board/Map toggle at the top (two-button segmented control), an "Add to calendar" link,
  an AI-suggestions strip, then the days grouped by city "leg" (if the trip has multi-city legs) as a responsive
  grid of **day columns**. Each **day column** is its own card: a date heading, an "Add item" button that reveals
  an inline form, and a vertically-stacked, drag-reorderable list of **item cards**. Each **item card** shows: a
  drag handle, time (if set), a category badge (Activity/Food/Transport/Lodging/Other, each with its own icon +
  color), title, optional description/location/cost, an optional link preview, a heart-vote button with count and
  voter avatars, "Added by [name]", edit/delete icons (owner/creator only, revealed on hover), a "Find food
  nearby" AI shortcut when the item has coordinates, and a collapsible comment thread at the bottom. A **Map**
  view alternative plots all geocoded items on a Google Map, color-coded and numbered per day, with a
  connecting polyline per day and a day-color legend below.
- **Lodging / Food boards**: same shape — a card at top for adding a new option (name/URL/price/notes/location
  for lodging; name/URL/cuisine/notes for food), then option cards in a 2-column grid, sorted by vote count
  (lodging additionally splits into a "Booked" section and a "Proposed" section). Each option card: name, price
  breakdown (per-night and per-person-per-trip for lodging), notes, location + "find food nearby" shortcut,
  link preview, a "Booking details" sub-panel (confirmation number with copy-to-clipboard, booking URL, notes)
  once anything is booked, heart-vote row, and a comment thread. Food cards additionally offer a "Plan for a day"
  inline scheduler (day + time picker) that promotes the restaurant into an itinerary item.
- **Flights**: two independent boards on one page. (1) A grid of one **flight card per trip member** — self's
  card is editable (status toggle: Searching/Booked/Opted out, plus a form for airline, flight number, price,
  airports, times, booking link, confirmation number with copy button); everyone else's card is read-only. A
  progress pill up top shows "X/Y booked". (2) A **flight search & suggest** section: a search form (origin/dest
  airport codes, dates, nonstop-only checkbox) hitting the Amadeus API, a results list (airline/flight
  number/stops badge/times/duration/price + "Suggest to group" button + a Google Flights deep link), and the
  resulting shared **suggestion cards** (same visual language as lodging cards: vote-free here, just booked
  toggle + delete, since suggestions aren't voted on — they're proposed and marked booked).
- **Budget**: entirely read-only/computed, no forms. A hero card shows the gradient-styled trip total with a
  3-column breakdown (Flights / Lodging / Itinerary totals) beneath a divider. A second card lists **per-person**
  rows (name + flight cost + lodging share + itinerary share + bold total), sorted highest-total first.
- **Expenses**: a **balances summary** card (per-member "gets back $X" / "owes $X" / "settled up" list, plus a
  computed minimal "who pays whom" settle-up list with arrows) above an "Add an expense" card (description,
  amount, category, payer, even-split-among-selected-members) and a reverse-chronological list of **expense
  cards** (payer avatar, description + category badge, "[payer] paid · [date] · split N ways", amount, delete for
  the creator).
- **Documents**: a drag-and-drop upload zone card (also a click-to-browse button) above a list of uploaded-file
  rows (type icon, name, size · uploader · relative time, download + delete actions).
- **Overview**: trip details card (editable name/destination/dates/cover photo), a "Cities" (multi-leg) editor
  card, a "Who's free when" date-availability grid (each day as a row with a percentage-tinted background, an
  avatar stack of who's free, and a per-user toggle button; a computed "best window" banner with a one-tap "Lock
  these dates" action appears when there's useful overlap; once locked, this collapses to a simple locked-dates
  banner with an unlock option for the owner) — plus a sidebar with an exports card (PDF/ICS download links) and
  a live activity feed (scrollable list of recent event summaries with relative timestamps).
- **Settings**: invite-code card (large monospaced code, copy code/copy link/native-share-or-copy-message
  buttons), pending join-requests card (owner-only, each request shows the requester + per-category permission
  toggles + approve/deny), member list (avatar-linked-to-public-profile, owner badge, per-member "Leave" (self)
  or "Remove" (owner) button, and for non-owner members an owner-only inline permission-toggle row: Lodging /
  Food / Itinerary / Flights switches), a trip-preferences card (multi-select "vibe"/"pace" quiz chips, editable
  any time), a trip-completion toggle card, and a danger-zone card (delete trip, confirm dialog).
- **Assistant / AI section card**: a shared shell (`AiSectionCard`) used by all four AI features — a rounded
  card with a sparkle icon, title, one-line description, a "Show/Hide" toggle (once content exists) and a
  generate/regenerate button on the right, expanding into feature-specific content below a divider.
  - *Itinerary/Restaurant suggestions*: idea cards with a day badge (itinerary only) / cuisine badge, description,
    an italic AI rationale line, and "Add to day"/"Save possibility" + "Dismiss" actions.
  - *Packing list*: items grouped by category as checkboxes, each showing "+N packed" when other members have
    also checked it off (per-member, not shared, checked state).
  - *Catch me up*: a short prose summary plus two bulleted columns, "Decided" (green) and "Still open" (amber).
- **Comment thread**: a quiet inline trigger ("Add a comment" / "N comments") on any votable item; expands into
  a scrollable list of avatar + name + relative-time + body, a delete icon for the author's own comments, and a
  pill-shaped input + "Post" button.
- **Design-system primitives** (`components/ui/`): `Button` (primary/secondary/ghost/danger × sm/md/lg, always
  pill-shaped), `Card`/`HoverCard`, `Badge`/`ProgressPill`, `Input`/`Textarea`/`Select`/`Label`/`FieldError`,
  `Avatar`/`AvatarStack` (initials-on-color-circle fallback, image if set, overlapping stack with "+N" overflow),
  `Switch` (pill toggle), `AnimatedTabs`, `EmptyState` (icon + title + description + optional CTA in a dashed
  card), `Logo`/`LogoMark`, `ThemeToggle` (sun/moon icon button), `RouteBackdrop`/`RouteConnector` (decorative
  SVGs), `LinkPreview` (full/compact variants, fetches OG metadata server-side with a proxy for hotlink-blocked
  images), `PlaceAutocomplete` (Google Places-backed text input, degrades to plain text input with no key set).

---

## 3. Data model

Supabase Postgres. Schema is defined across 18 timestamped migrations in `supabase/migrations/`, applied in
filename order — later migrations alter/harden earlier ones (see call-outs below). All primary keys are
`uuid` (`gen_random_uuid()`), all tables use `public` schema.

### 3.1 Auth setup

- **Provider**: Supabase Auth, **email + password only** — no OAuth/social providers configured anywhere in the
  codebase or env vars.
- Email confirmation is a Supabase-project-level toggle (not app code); the signup form handles both outcomes
  (immediate session vs. "check your email" message).
- Password reset: `/forgot-password` → Supabase `resetPasswordForEmail` → emailed link → `/auth/confirm` route
  handler exchanges the token for a session → `/reset-password` to set a new password. Minimum password length:
  8 characters (enforced client/server in the app, not just Postgres).
- **`public.profiles`** is a 1:1 shadow of `auth.users`, auto-created by an `AFTER INSERT ON auth.users` trigger
  (`handle_new_user`) that seeds `name` (from signup metadata, falling back to the email's local-part),
  `email`, `phone_number`, and `sms_opt_in` from the signup form's metadata payload.
- Session handling: `@supabase/ssr` cookie-based sessions, refreshed by Next.js middleware on every request.
  Unauthenticated users hitting a non-public path are redirected to `/login?redirect=<original path>`; API
  routes return a `401` JSON error instead of a redirect. Already-authenticated users hitting `/login` or
  `/signup` are bounced to `/dashboard` (or their `redirect` target).
- Public profile pages (`/u/[userId]`) intentionally expose a *narrower* slice of data (name, avatar) to any
  signed-in user, not just trip-mates — implemented as two `SECURITY DEFINER` RPCs
  (`get_public_profile`, `get_public_completed_trips`) rather than loosening the `profiles` table's RLS.

### 3.2 Access-control model

Nearly every table is scoped by `trip_id` and gated by two `SECURITY DEFINER` SQL helper functions (to avoid RLS
recursion): `is_trip_member(trip_id)` and `is_trip_owner(trip_id)`, both checking `public.trip_members` against
`auth.uid()`. A third, `can_edit_category(trip_id, category)`, backs a **per-member, per-category permission
system**: trip owners can grant individual members edit rights on lodging / food / itinerary / flight-suggestions
created by *other* people (`trip_members.can_edit_lodging/food/itinerary/flights`, all boolean, default false).
The baseline rule for anything ownable is **creator, or trip owner, or granted category permission** may
update/delete; **any trip member** may read and create. A later hardening migration additionally revoked blanket
`UPDATE` grants and re-granted **column-scoped** UPDATE per table, so RLS policies can't be bypassed by writing to
identity/ownership/timestamp columns the app never exposes in a form (e.g. a member can't UPDATE their own
`trip_members.role` to `'owner'`).

Mutating flows that need to bypass/centralize RLS use `SECURITY DEFINER` RPCs instead of direct table writes:
`create_trip`, `join_trip_by_code` *(legacy — superseded by the request/approve flow below but still present)*,
`leave_trip`, `remove_trip_member`, `delete_trip`, `set_trip_member_permission`, `request_to_join`,
`approve_join_request`, `deny_join_request`, `set_trip_completed`, `get_public_profile`,
`get_public_completed_trips`. All are `revoke`d from `anon`/`public` and granted only to `authenticated`.

### 3.3 Tables

**`profiles`** — extends `auth.users` 1:1.
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id`, cascades on user delete |
| `name` | text not null | |
| `email` | text not null | |
| `phone_number` | text | nullable, for SMS |
| `sms_opt_in` | boolean not null default false | |
| `avatar_color` | text not null default `#16A34A` | hex, used for initials-avatar background |
| `avatar_url` | text | nullable; Storage public URL, added later |
| `created_at`, `updated_at` | timestamptz | |

RLS: select self or anyone sharing a trip (`shares_trip_with`), plus a widened select for trip owners viewing a
pending join-requester's name. Update limited to `(name, phone_number, sms_opt_in, avatar_color, avatar_url)`.

**`trips`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text not null | |
| `destination` | text | free text |
| `destination_lat`, `destination_lng` | double precision | from Places autocomplete, added later |
| `start_date`, `end_date` | date | nullable until locked |
| `dates_locked` | boolean default false | |
| `cover_image` | text | URL (Unsplash or Storage) |
| `invite_code` | text unique | 7-char, generated from a 32-symbol alphabet excluding `O/0/I/1` |
| `created_by` | uuid → profiles | |
| `completed_at` | timestamptz | nullable; manual owner-set flag, added later |
| `created_at`, `updated_at` | timestamptz | |

RLS: select/update = member; delete = owner only. Update columns restricted to
`(name, destination, start_date, end_date, dates_locked, cover_image, destination_lat, destination_lng)`.

**`trip_members`** — composite PK `(trip_id, user_id)`.
| Column | Type | Notes |
|---|---|---|
| `trip_id`, `user_id` | uuid FK | |
| `display_name` | text not null | snapshot at join time |
| `role` | text default `'member'` | `'owner' \| 'member'` |
| `can_edit_lodging/food/itinerary/flights` | boolean default false | per-member category permissions |
| `joined_at` | timestamptz | |

RLS: select = member; delete = self **or** owner, but **owners can never be removed and can never leave** (must
delete the trip instead) — enforced both in RLS (`role = 'member'`) and inside the `leave_trip`/`remove_trip_member`
RPCs. Update limited to `display_name` (permission flags are only writable via the `set_trip_member_permission`
RPC, which itself checks `is_trip_owner`).

**`flights`** — one row per (trip, member); unique `(trip_id, user_id)`.
status ∈ `searching | booked | opted_out`. Columns: `airline, flight_number, price numeric(10,2),
departure_airport, arrival_airport, departure_time timestamptz, arrival_time timestamptz, booking_link, notes,
confirmation_number, locked_in boolean`. RLS: any member reads all; only the owning `user_id` may
insert/update/delete their own row.

**`lodging_options`** — status ∈ `proposed | booked`. Columns: `name, url, price_per_night numeric(10,2), notes,
location, lat, lng, confirmation_number, booking_url, booking_notes, created_by, created_at, updated_at`. RLS:
member reads/creates; update/delete = creator, owner, or `can_edit_lodging`.

**`lodging_votes`** — composite PK `(lodging_option_id, user_id)`, denormalized `trip_id` (kept in sync via an
insert-time subquery check) for realtime filtering. One vote per member per option (toggle = insert/delete).

**`itinerary_items`**
| Column | Type | Notes |
|---|---|---|
| `id`, `trip_id` | uuid | |
| `day` | date not null | |
| `time` | time | nullable = "flexible" |
| `title` | text not null | |
| `description`, `location`, `link` | text | |
| `category` | text default `'activity'` | `activity \| food \| transport \| lodging \| other` |
| `cost` | numeric(10,2) | |
| `position` | double precision default 0 | fractional ordering for drag-reorder (new position = midpoint between neighbors, or ±1 at the ends) |
| `lat`, `lng` | double precision | geocoded async after location text is entered |
| `created_by`, `created_at`, `updated_at` | | |

Index on `(trip_id, day, position)`. RLS: member reads/creates; update/delete = creator, owner, or
`can_edit_itinerary`.

**`itinerary_votes`** — same shape as lodging_votes, PK `(itinerary_item_id, user_id)`.

**`restaurants`** — `name, url, cuisine, notes, created_by, created_at`. RLS: member reads/creates; update/delete
= creator, owner, or `can_edit_food`.

**`restaurant_votes`** — PK `(restaurant_id, user_id)`, denormalized `trip_id`.

**`flight_suggestions`** — the *shared* board (distinct from personal `flights`). status ∈ `proposed | booked`.
Columns: `airline, flight_number, price, departure_airport, arrival_airport, departure_time, arrival_time,
nonstop boolean, booking_link, notes, created_by`. RLS: member reads/creates; update/delete = creator, owner, or
`can_edit_flights`. *(A `flight_suggestion_votes` table existed briefly and was dropped in
`20260710050000` — flight suggestions are not voted on in the current schema, just proposed/booked.)*

**`ai_suggestions`** — a generic bucket for every AI feature's output.
`type` ∈ `itinerary | restaurant | packing | budget | catch_me_up` (note: `packing` and `budget` are allowed by
the check constraint but not currently produced — packing list writes to its own `packing_items` table instead,
and there is no budget-AI feature implemented). `content` is `jsonb` (shape varies per `type`, matching each AI
endpoint's Zod schema — see §4.3). `status` ∈ `suggested | accepted | dismissed`. RLS: any member can
read/insert/update/delete (suggestions aren't creator-locked — any member can dismiss/accept any suggestion, and
generating suggestions inserts rows attributed to the calling user via `created_by`).

**`packing_items`** — `label, category, source` (`ai | manual`). RLS: member reads/creates; **no update/delete
policy exists** for this table (items are effectively permanent once created; only per-user *check* state is
mutable — see below).

**`packing_item_checks`** — composite PK `(packing_item_id, user_id)`, denormalized `trip_id`, `checked boolean
default true`. Per-member checkbox state layered onto a shared list (`+N packed` in the UI reads other members'
checks). RLS: self-scoped insert/update/delete.

**`trip_date_availability`** — composite PK `(trip_id, user_id, date)`. Presence of a row = that member is free
that day (no boolean column; toggle = insert/delete). Self-scoped insert/delete, member-scoped select. *(This
superseded an earlier `trip_date_proposals`/`trip_date_votes` pair of tables that were dropped in
`20260710050000` — Tandem no longer uses discrete date-range proposals, only per-day availability + a
client-computed "best overlapping window".)*

**`trip_documents`** — `name, file_path, content_type, size_bytes bigint, uploaded_by, created_at`. Files live in
a **private** Storage bucket `trip-documents`, path-prefixed `"<trip_id>/<uuid><ext>"` so the bucket's own RLS
policies gate access by checking `is_trip_member` on the first path segment. RLS: member reads/creates; delete =
uploader or owner. Downloads are served via short-lived (300s) signed URLs, never public links.

**`expenses`** — `paid_by uuid, description, amount numeric(10,2) check(>0), category (lodging|food|transport|
activity|other), expense_date date default current_date, created_by uuid`. `created_by` (the person who logged
it — added in a later hardening migration and back-filled from `paid_by`) is tracked **separately** from
`paid_by`, since the UI lets someone log an expense on another member's behalf; only the *recorder*
(`created_by`) can edit/delete, and both the payer and every split recipient must be verified trip members at
insert time.

**`expense_splits`** — composite PK `(expense_id, user_id)`, `amount numeric(10,2) check(>=0)`. **No `trip_id`
column** — membership is always resolved through the parent `expenses` row, and the client's realtime
subscription for this table is therefore unfiltered (RLS still scopes visible rows to the caller's trips).
Amounts are computed client-side as an even split in integer cents (remainder cents distributed to the
alphabetically-earliest member IDs) so splits always sum exactly.

**`comments`** — polymorphic, no FK on the target: `target_type` ∈ `lodging | restaurant | itinerary |
flight_suggestion`, `target_id uuid`, `body text check(1..2000 chars)`. An insert-time `CASE` in the RLS policy
verifies the referenced row actually exists and belongs to the stated trip. Delete = author or trip owner.

**`activity_events`** — append-only audit/feed log: `user_id, event_type text, summary text, created_at`. Rows
are written exclusively by `AFTER INSERT/UPDATE/DELETE` triggers on other tables (not direct app inserts) via a
non-client-callable `log_activity()` helper. Triggers cover: join request approved/denied, member left/removed,
member permission changed, lodging added/deleted/booked, itinerary item added/deleted, restaurant
added/deleted, trip marked completed/reopened. (Notably *not* covered: flights, expenses, comments, documents,
budget changes — the feed is not exhaustive.)

**`trip_legs`** — optional multi-city support: `city, start_date, end_date, cover_image, created_by`, check
`end_date >= start_date`. Purely organizational metadata — itinerary days are grouped under whichever leg's date
range contains them **at render time in the client**, not stored per-item; lodging/food/flights/budget remain
trip-wide regardless of legs. RLS: any member can select/insert/update/delete (legs are treated like trip
metadata, not an ownable proposal).

**`trip_join_requests`** — replaces immediate join-by-code with owner approval. `status` ∈ `pending | approved |
denied`, unique `(trip_id, user_id)` (re-requesting after denial flips back to pending). No direct
insert/update policy — all writes go through `request_to_join`/`approve_join_request`/`deny_join_request` RPCs.
`approve_join_request` takes the four category-permission booleans as parameters so an owner sets initial
permissions in the same action as approval.

**`trip_preferences`** — one row per `(trip_id, user_id)` (unique constraint): `answers jsonb default '{}'`. A
lightweight two-question "what do you want from this trip" quiz (`vibe`: Nature/Museums/Food & nightlife/
Shopping/Relaxing; `pace`: Packed/Go with the flow/Mostly downtime — both multi-select), visible to the whole
trip, self-editable. Not currently consumed by any AI prompt (captured but not yet fed back into suggestions).

### 3.4 Storage buckets

| Bucket | Public | Path convention | Access rule |
|---|---|---|---|
| `trip-documents` | No (signed URLs, 300s TTL) | `<trip_id>/<uuid><ext>` | trip membership via path prefix |
| `trip-covers` | Yes | `<trip_id or trip_id/legs/leg_id>/<uuid><ext>` | insert/update/delete = trip member; select = anyone |
| `avatars` | Yes | `<user_id>/<uuid><ext>` | insert/update/delete = owning user only; select = anyone |

### 3.5 Realtime publication

`supabase_realtime` (Postgres logical replication publication) currently includes: `trips`, `trip_members`,
`flights`, `lodging_options`, `lodging_votes`, `itinerary_items`, `itinerary_votes`, `restaurants`,
`restaurant_votes`, `flight_suggestions`, `ai_suggestions`, `packing_items`, `packing_item_checks`,
`trip_date_availability`, `trip_documents`, `expenses`, `expense_splits`, `comments`, `activity_events`,
`trip_legs`, `trip_join_requests`, `trip_preferences`. (`trip_date_proposals`, `trip_date_votes`, and
`flight_suggestion_votes` were added then later dropped along with their tables; `profiles` was never added.)
See §5 for which of these actually have a UI subscriber.

---

## 4. Feature inventory

### 4.1 Fully implemented

- Email/password auth: sign up, sign in, sign out, forgot/reset password, redirect-preserving deep links.
- Trip creation, invite-code generation, invite-by-link (`/join/[code]`) and invite-by-manual-code
  (`/trips/join`), **owner-approval join flow** (request → approve/deny, with initial per-category permissions
  set at approval time).
- Per-member, per-category (lodging/food/itinerary/flights) edit-permission grants, owner-managed.
- Trip details editing (name, destination w/ Places autocomplete + coordinates, dates, cover photo — auto-suggested
  from Unsplash on leg creation, manually replaceable).
- Multi-city "legs" (optional): add/edit/delete cities with their own date range and cover photo; itinerary
  automatically groups by leg.
- Group date-availability voting (mark free days, see overlap %, computed "best window" suggestion, one-tap lock,
  owner-only unlock) as the trip's sole date-coordination mechanism.
- Itinerary board: add/edit/delete items, drag-and-drop reorder within a day, heart-voting, category tagging,
  cost tracking, link previews, geocoding (via OpenStreetMap Nominatim, rate-limited to 1 req/s server-side,
  cached in-memory) feeding a live Google Map view with per-day color coding and polylines.
- Lodging board: propose/vote/book, price-per-night → total-per-trip → per-person split math, booking-details
  sub-panel (confirmation #, URL, notes) with copy-to-clipboard.
- Food board: propose/vote, "plan for a day" → promotes a restaurant into an itinerary item, Apple Maps deep
  links for any restaurant (AI-suggested or manual).
- Flights: personal per-member tracker (status + full flight details + confirmation #), live flight search via
  Amadeus (Self-Service test environment) with a shared "suggest to group" board, Google Flights deep links as a
  fallback/complement to the live search. *(Note: the project README describes flights as "Phase 1 — manual
  entry only, no live search API integration yet." That is stale documentation — live Amadeus search is fully
  implemented in the current code, gated only by whether `AMADEUS_CLIENT_ID`/`SECRET` env vars are set; without
  them, search returns a 503 and manual entry still works.)*
- Budget: fully computed (no manual entry) trip-total and per-person breakdown across flights (per-person actual)
  + lodging (booked-only, split evenly across all members) + itinerary costs (split evenly across all members).
- Expenses: add/delete, even-split-in-cents among any subset of members, live balances ("gets back"/"owes"),
  greedy minimal-transfer settle-up suggestions, SMS notification to opted-in members when an expense is logged.
- Documents: drag-and-drop or click upload (20MB cap), private storage, signed-URL download, delete.
- Comments: threaded per-item discussion on lodging/restaurant/itinerary/flight-suggestion, with optimistic
  posting and realtime sync scoped to whichever thread is open.
- Activity feed: trigger-generated audit log of key trip events (see §3.3 for exact coverage).
- Trip completion flag + public profile trip history (`/u/[userId]`).
- Account settings: avatar upload, phone number + SMS opt-in, test-SMS button.
- Exports: full trip PDF (`@react-pdf/renderer` — members, flights, lodging w/ votes, itinerary by day,
  restaurants w/ votes, documents list, budget) and an `.ics` calendar file (trip date range as an all-day event,
  itinerary items as timed or all-day events with floating local time, flights with departure/arrival times).
- Theming: light/dark toggle, persisted to `localStorage`, applied before first paint to avoid flash.
- Dark/light-aware everywhere; no separate "system" option (binary toggle only, defaults to dark).

### 4.2 Partial / notable limitations (not fully "features," but relevant for parity)

- **Trip preferences quiz** is captured and displayed but **not yet consumed** by any AI prompt or suggestion
  logic — it's forward-looking infrastructure.
- **Activity feed coverage is partial** — flights, expenses, comments, and document uploads do not generate
  activity events; only join decisions, member changes, lodging, itinerary, and restaurant add/delete/booked do.
- **`ai_suggestions.type` allows `'packing'` and `'budget'`** at the database level but neither is ever produced
  by the app (packing list uses a dedicated `packing_items` table instead; there is no AI budget feature).
- **`packing_items` has no update/delete policy** — once generated/added, list items can't be edited or removed
  by the app as currently built (only their per-user checked state is mutable).
- SMS notifications are deliberately narrow: only fired on (1) an expense being logged and (2) trip dates being
  locked in, plus a manual "send test text" button — not a general notification system.
- `useRealtimeRow` (a single-row realtime hook) is defined in `lib/hooks/use-realtime-list.ts` but is not
  currently used anywhere in the app — effectively dead/reserved code.
- Several integrations degrade gracefully to "off" rather than breaking when unconfigured: Google
  Maps/Places (plain text input, no map), Amadeus (search disabled, 503), Anthropic (AI buttons will error),
  Unsplash (no auto cover photo), Twilio (SMS silently no-ops).

### 4.3 AI features — exact behavior

All AI features share one code path: `lib/ai/client.ts` wraps the **Anthropic Claude API** (`@anthropic-ai/sdk`,
model `claude-opus-4-8` by default, overridable via `ANTHROPIC_MODEL`) using **structured output** —
`messages.parse()` with a Zod schema (`output_config.effort: "medium"`) — so every response is a validated JSON
object, not free text. Errors are normalized into an `AiGenerationError` with a user-facing message and an HTTP
status (429 rate-limited, 503 unreachable, etc.), surfaced verbatim in the UI. Every endpoint requires an
authenticated session and trip membership before calling out to Claude.

1. **Itinerary suggestions** — `POST /api/ai/itinerary-suggestions`. Feeds Claude the trip's name, destination,
   dates, and a text summary of every existing itinerary item (day, time, title, category, location). System
   prompt frames Claude as a "friendly, knowledgeable local trip-planning assistant" told to be concrete and
   destination-specific, never invent a specific business it isn't confident is real, and prefer well-known
   landmarks when unsure. Asks for **up to 5** suggestions filling schedule gaps, each with day/time/title/
   description/location/category/a one-sentence rationale. Returns an empty list rather than guessing if the
   trip has no dates and no existing items to infer from. Results are inserted as `ai_suggestions` rows
   (`type='itinerary'`, `status='suggested'`); the UI lets the member pick which day to add each to (defaulting
   to Claude's suggested day) before accepting, or dismiss it.
2. **Restaurant suggestions** — `POST /api/ai/restaurant-suggestions`. Feeds trip name/destination, the group's
   already-voted-on cuisines (ranked by vote count + list count) and existing restaurant names (to avoid
   duplicates). System prompt: "well-traveled local food recommender," concrete, never invents restaurants it
   isn't confident are real. Asks for **up to 5**, weighted toward the group's shown cuisine preferences but
   including at least one or two different ideas. Each suggestion: name, cuisine, location (street address or
   neighborhood), 1–2 sentence rationale. Accepting inserts directly into `restaurants` with an Apple Maps search
   URL auto-generated from name + location.
3. **"Find food nearby"** — `POST /api/ai/food-near` (triggered from an itinerary or lodging item's location, not
   its own assistant-page section). Same restaurant-recommender system prompt, but anchored to a specific
   lat/lng + label instead of the whole destination; asks for real, well-known places within easy walking/short
   transit distance, preferring fewer results over invented ones if unsure. Stores the anchor's label/lat/lng
   alongside each suggestion's content. Fires from a small inline button, then navigates the user to the Food tab
   to see results.
4. **Packing list** — `POST /api/ai/packing-list`. Feeds trip name/destination/dates (+ nights) and a summary of
   existing itinerary items. System prompt: "practical, experienced traveler," tailor to destination/season/trip
   type, no generic filler. Claude first **infers a trip type** (beach, hiking/outdoors, city sightseeing, ski,
   road trip, festival, etc.) from the destination + itinerary, then generates **up to 35** items grouped by
   category (Clothing, Toiletries, Documents, Gear, Electronics, etc.). Items are inserted into the shared
   `packing_items` table (`source='ai'`); each member checks off their own copy via `packing_item_checks`, and
   sees a "+N packed" hint for items others have also checked.
5. **Catch me up** — `POST /api/ai/catch-me-up`. Feeds trip name/destination/dates, member count, lodging status
   (booked name, or proposed-count + names), flight booking counts, itinerary item count + sample titles,
   restaurant count + names. System prompt: write short, casual catch-up summaries "like a quick recap from a
   friend, not a formal report." Returns a 2–4 sentence plain-text summary plus two short bullet lists —
   "Decided" (up to 8) and "Still open" (up to 8). Stored as a single `ai_suggestions` row (`type='catch_me_up'`);
   only the most recent one is shown, with a "Refresh summary" re-generate action.

### 4.4 Third-party integrations

| Service | Used for | Required env var(s) | Degrades to when unset |
|---|---|---|---|
| Anthropic (Claude) | All 5 AI features above | `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` | N/A — AI buttons will fail |
| Supabase | Postgres DB, Auth, Realtime, Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app cannot function |
| Google Maps/Places JS API | Destination/lodging place autocomplete, itinerary map | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | plain text inputs, no map (explicit "key missing" empty state) |
| Amadeus Self-Service (test) | Live flight search | `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` | search returns 503 "not configured"; manual flight entry + Google Flights links still work |
| Unsplash | Auto-suggested trip/city cover photos | `UNSPLASH_ACCESS_KEY` | no auto photo; manual upload still works |
| Twilio | SMS on expense logged / dates locked / test text | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | silently no-ops (logs a warning) |
| OpenStreetMap Nominatim | Geocoding itinerary location text → lat/lng | none (public API, rate-limited client-side to 1 req/s, in-memory cache) | — |
| Generic Open Graph scraper | Link previews for pasted URLs (Airbnb/Vrbo/OpenTable/etc.) | none | falls back to a plain link |

---

## 5. Realtime behavior

All realtime is Supabase Realtime over `postgres_changes` (logical replication → WebSocket), consumed through a
small set of shared React hooks in `lib/hooks/use-realtime-list.ts`:

- **`useRealtimeList<T>(table, tripId, initial)`** — the default pattern. Opens one channel per
  `(table, tripId)`, filtered server-side on `trip_id=eq.<tripId>`, and merges INSERT/UPDATE/DELETE events into
  local state (dedupe by `id`). Used for tables with a real `trip_id` column and single-row identity.
- **`useRealtimeJoinList<T>(table, tripId, initial, keyOf)`** — identical, but for join/vote tables with no
  single-column primary key (composite keys like `(item_id, user_id)`); takes a `keyOf` function to derive a
  stable dedupe key instead of assuming `.id`.
- **`useRealtimeRow<T>(table, id, initial)`** — single-row-by-`id` variant. Defined but currently **unused** by
  any component.

Two components subscribe manually instead of using the shared hooks, because their table shape doesn't fit the
`trip_id`-filtered pattern:
- **`expense_splits`** (`ExpensesClient`) has no `trip_id` column, so its channel subscribes **unfiltered** to
  all INSERT/DELETE events on the table and relies on RLS to only deliver rows the caller can see; the client
  joins them against the currently-loaded expense list.
- **`comments`** (`CommentThread`) subscribes per-open-thread, filtered by `target_id=eq.<id>` (not `trip_id`,
  since many threads share a trip), with an additional client-side check on `target_type` since `target_id`
  alone isn't globally unique across target types.

### What's live and what triggers it

| Table | Subscribed where | Live update fires on |
|---|---|---|
| `trip_members` | Settings → member list | a member joining, leaving, being removed, or a permission toggle changing |
| `flights` | Flights tab, Budget tab | any member saving/updating their personal flight |
| `lodging_options` | Lodging tab, Budget tab | propose / edit / delete / book-toggle |
| `lodging_votes` | Lodging tab | any member's vote toggle |
| `itinerary_items` | Itinerary tab, Budget tab | add / edit / delete / drag-reorder (position change) |
| `itinerary_votes` | Itinerary tab | any member's vote toggle |
| `restaurants` | Food tab | add / delete |
| `restaurant_votes` | Food tab | any member's vote toggle |
| `flight_suggestions` | Flights tab (suggestions board) | suggest-to-group / delete / book-toggle |
| `ai_suggestions` | Itinerary, Food, Assistant tabs | a new suggestion generated, or accepted/dismissed by anyone |
| `packing_items` | Assistant tab | AI generates a new list |
| `packing_item_checks` | Assistant tab | any member checking/unchecking an item |
| `trip_date_availability` | Overview tab | any member toggling a free day |
| `trip_documents` | Documents tab | upload / delete |
| `expenses` | Expenses tab | add / delete |
| `expense_splits` | Expenses tab | split rows inserted/deleted alongside an expense (unfiltered subscription, see above) |
| `comments` | wherever a thread is expanded | post / delete, scoped to that one open thread |
| `activity_events` | Overview tab (feed) | any of the trigger-logged events in §3.3 |
| `trip_legs` | Overview tab, Itinerary tab | add / edit (incl. cover photo) / delete a city leg |
| `trip_join_requests` | Settings tab (owner) | a new join request, or an existing one being approved/denied |

**Published but with no active UI subscriber** (changes require a page refresh to appear elsewhere):
- **`trips`** — the trip's own name/destination/dates/cover-photo row. `TripHeader` and `TripDetailsCard` read it
  once at page load; another member editing the trip won't live-update your open tab.
- **`trip_preferences`** — added to the publication but `TripPreferencesCard` uses local state only.

**Never realtime** (not in the publication at all): `profiles` — a member's name/avatar/color change won't
propagate live to other open tabs; everywhere profile data is joined in, it's fetched at page load.

**Optimistic-update convention**: nearly every mutation follows the same shape — update local React state
immediately (assuming success), fire the Supabase write, and (for a few flows like posting a comment) roll back
the optimistic change if the write fails. The realtime subscription is what reconciles *other* members' views,
not the acting member's own (their own change is already applied optimistically, and the resulting realtime
event is deduped away by the `id`/composite-key check in the hooks).
