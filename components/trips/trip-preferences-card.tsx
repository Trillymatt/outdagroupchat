"use client";

import { useState } from "react";
import { ListChecks, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/ui/input";
import { PreferenceQuestions } from "@/components/trips/preference-questions";
import { createClient } from "@/lib/supabase/client";
import { PREFERENCE_QUESTIONS, type PreferenceAnswers } from "@/lib/utils/trip-preferences";

export function TripPreferencesCard({
  tripId,
  currentUserId,
  initialAnswers,
}: {
  tripId: string;
  currentUserId: string;
  initialAnswers: PreferenceAnswers | null;
}) {
  const [saved, setSaved] = useState(initialAnswers);
  const [draft, setDraft] = useState<PreferenceAnswers>(initialAnswers ?? {});
  const [editing, setEditing] = useState(!initialAnswers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasAnswers = saved && Object.values(saved).some((v) => v.length > 0);

  async function save() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("trip_preferences")
      .upsert({ trip_id: tripId, user_id: currentUserId, answers: draft, updated_at: new Date().toISOString() }, { onConflict: "trip_id,user_id" });
    setSaving(false);
    if (saveError) {
      setError("Couldn't save — try again.");
      return;
    }
    setSaved(draft);
    setEditing(false);
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-green-dark" />
          <h2 className="font-semibold text-ink">Trip preferences</h2>
        </div>
        {hasAnswers && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>

      {!editing && hasAnswers ? (
        <div className="space-y-2">
          {PREFERENCE_QUESTIONS.map((q) => {
            const picked = saved?.[q.key] ?? [];
            if (picked.length === 0) return null;
            return (
              <div key={q.key}>
                <p className="text-xs text-ink-soft">{q.question}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {picked.map((p) => (
                    <Badge key={p} tone="green">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-soft">What are you hoping to get out of this trip? Helps tailor suggestions for the group.</p>
          <PreferenceQuestions answers={draft} onChange={setDraft} />
          <FieldError>{error}</FieldError>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {hasAnswers && (
              <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
