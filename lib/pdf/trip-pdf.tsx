import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format, parseISO } from "date-fns";
import type { BudgetSummary } from "@/lib/budget/compute";

export interface TripPdfData {
  trip: { name: string; destination: string | null; start_date: string | null; end_date: string | null };
  members: { name: string }[];
  flights: {
    memberName: string;
    airline: string | null;
    flight_number: string | null;
    departure_airport: string | null;
    arrival_airport: string | null;
    departure_time: string | null;
    arrival_time: string | null;
    price: number | null;
    status: string;
  }[];
  lodging: { name: string; url: string | null; price_per_night: number | null; notes: string | null; status: string; votes: number }[];
  itineraryByDay: { day: string; items: { time: string | null; title: string; category: string; location: string | null; cost: number | null; description: string | null }[] }[];
  restaurants: { name: string; cuisine: string | null; url: string | null; votes: number }[];
  documents: { name: string; uploaderName: string }[];
  budget: BudgetSummary | null;
  nights: number | null;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1c1a27" },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, color: "#6b6880", marginTop: 4 },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1f5f42",
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#d8d5e0",
    marginBottom: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  itemBlock: { marginBottom: 6 },
  itemTitle: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b6880" },
  small: { fontSize: 9, color: "#6b6880" },
  dayHeading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4 },
  timeCol: { width: 58 },
  badge: { color: "#1f5f42", fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9a97a8",
  },
});

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function fmtDay(day: string): string {
  return format(parseISO(day), "EEEE, MMM d");
}

function fmtTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = Number(h);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${period}`;
}

function fmtFlightTime(iso: string | null): string {
  return iso ? format(new Date(iso), "MMM d, h:mm a") : "";
}

export function TripPdf({ data }: { data: TripPdfData }) {
  const { trip, members, flights, lodging, itineraryByDay, restaurants, documents, budget, nights } = data;
  const dates =
    trip.start_date && trip.end_date
      ? `${format(parseISO(trip.start_date), "MMM d")} – ${format(parseISO(trip.end_date), "MMM d, yyyy")}${nights ? ` · ${nights} nights` : ""}`
      : "Dates TBD";
  const booked = lodging.filter((l) => l.status === "booked");
  const proposed = lodging.filter((l) => l.status !== "booked");

  return (
    <Document title={`${trip.name} — Trip Summary`} author="Tandem">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{trip.name}</Text>
        <Text style={styles.subtitle}>
          {trip.destination ? `${trip.destination} · ` : ""}
          {dates}
        </Text>
        <Text style={[styles.subtitle, { marginTop: 2 }]}>Travelers: {members.map((m) => m.name).join(", ")}</Text>

        {flights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flights</Text>
            {flights.map((f, i) => (
              <View key={i} style={styles.itemBlock} wrap={false}>
                <View style={styles.row}>
                  <Text style={styles.itemTitle}>
                    {f.memberName}
                    {f.airline || f.flight_number ? ` — ${[f.airline, f.flight_number].filter(Boolean).join(" ")}` : ""}
                  </Text>
                  <Text>{f.price != null ? money(f.price) : ""}</Text>
                </View>
                <Text style={styles.muted}>
                  {[f.departure_airport, f.arrival_airport].filter(Boolean).join(" – ")}
                  {f.departure_time ? `  ·  ${fmtFlightTime(f.departure_time)}` : ""}
                  {f.arrival_time ? ` – ${fmtFlightTime(f.arrival_time)}` : ""}
                  {f.status !== "booked" ? `  ·  ${f.status.replace("_", " ")}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {lodging.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lodging</Text>
            {[...booked, ...proposed].map((l, i) => {
              const total = l.price_per_night != null && nights ? l.price_per_night * nights : null;
              const perPerson = total != null && members.length > 1 ? total / members.length : null;
              return (
                <View key={i} style={styles.itemBlock} wrap={false}>
                  <View style={styles.row}>
                    <Text style={styles.itemTitle}>
                      {l.name}
                      {l.status === "booked" ? "  ·  BOOKED" : ""}
                    </Text>
                    <Text>{l.price_per_night != null ? `${money(l.price_per_night)}/night` : ""}</Text>
                  </View>
                  {total != null && (
                    <Text style={styles.muted}>
                      {money(total)} total{perPerson != null ? ` · ${money(perPerson)}/person split ${members.length} ways` : ""}
                      {l.status !== "booked" ? ` · ${l.votes} ${l.votes === 1 ? "vote" : "votes"}` : ""}
                    </Text>
                  )}
                  {l.url && <Text style={styles.small}>{l.url}</Text>}
                  {l.notes && <Text style={styles.small}>{l.notes}</Text>}
                </View>
              );
            })}
          </View>
        )}

        {itineraryByDay.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Itinerary</Text>
            {itineraryByDay.map(({ day, items }) => (
              <View key={day}>
                <Text style={styles.dayHeading}>{fmtDay(day)}</Text>
                {items.map((item, i) => (
                  <View key={i} style={{ flexDirection: "row", marginBottom: 4 }} wrap={false}>
                    <Text style={[styles.timeCol, styles.muted]}>{fmtTime(item.time)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.small}>  {item.category}</Text>
                        {item.cost != null ? <Text style={styles.small}>  ·  {money(item.cost)}</Text> : null}
                      </Text>
                      {item.location && <Text style={styles.small}>{item.location}</Text>}
                      {item.description && <Text style={styles.small}>{item.description}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {restaurants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Food shortlist</Text>
            {restaurants.map((r, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text>
                  <Text style={styles.itemTitle}>{r.name}</Text>
                  {r.cuisine ? <Text style={styles.small}>  {r.cuisine}</Text> : null}
                </Text>
                <Text style={styles.muted}>
                  {r.votes} {r.votes === 1 ? "vote" : "votes"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {budget && budget.tripTotal > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget</Text>
            <View style={styles.row}>
              <Text style={styles.muted}>Flights</Text>
              <Text>{money(budget.flightsTotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.muted}>Lodging</Text>
              <Text>{money(budget.lodgingTotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.muted}>Activities & other</Text>
              <Text>{money(budget.itineraryTotal)}</Text>
            </View>
            <View style={[styles.row, { marginTop: 3 }]}>
              <Text style={styles.itemTitle}>Trip total</Text>
              <Text style={styles.itemTitle}>{money(budget.tripTotal)}</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              {budget.perPerson.map((p) => (
                <View key={p.userId} style={styles.row}>
                  <Text style={styles.muted}>{p.name}</Text>
                  <Text>{money(p.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {documents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents on file</Text>
            {documents.map((d, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text>{d.name}</Text>
                <Text style={styles.muted}>{d.uploaderName}</Text>
              </View>
            ))}
            <Text style={[styles.small, { marginTop: 4 }]}>Download the files themselves from the Documents tab.</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Generated by Tandem on {format(new Date(), "MMM d, yyyy")}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
