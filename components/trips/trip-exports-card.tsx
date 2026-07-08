import { CalendarPlus, FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";

export function TripExportsCard({ tripId }: { tripId: string }) {
  const linkClass =
    "flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-green/40 hover:bg-green/5";

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold text-ink">Take it with you</h2>
        <p className="text-sm text-ink-soft">One document with everything, right before you go.</p>
      </div>
      <div className="space-y-2">
        <a href={`/api/trips/${tripId}/export`} download className={linkClass}>
          <FileDown className="h-4 w-4 text-green-dark" />
          Download trip PDF
        </a>
        <a href={`/api/trips/${tripId}/calendar`} download className={linkClass}>
          <CalendarPlus className="h-4 w-4 text-green-dark" />
          Export calendar (.ics)
        </a>
      </div>
    </Card>
  );
}
