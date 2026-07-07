"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ItineraryItemCard } from "@/components/itinerary/itinerary-item-card";
import { ItineraryItemForm, type ItineraryFormValues } from "@/components/itinerary/itinerary-item-form";
import { formatDay } from "@/lib/utils/dates";
import type { ItineraryItem } from "@/lib/types/trip";

function SortableItem({
  item,
  authorName,
  authorColor,
  voteCount,
  votedByMe,
  voters,
  canEdit,
  onToggleVote,
  onEdit,
  onDelete,
}: {
  item: ItineraryItem;
  authorName?: string;
  authorColor?: string;
  voteCount: number;
  votedByMe: boolean;
  voters: { name: string; color?: string }[];
  canEdit: boolean;
  onToggleVote: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <ItineraryItemCard
      ref={setNodeRef}
      item={item}
      authorName={authorName}
      authorColor={authorColor}
      voteCount={voteCount}
      votedByMe={votedByMe}
      voters={voters}
      canEdit={canEdit}
      onToggleVote={onToggleVote}
      onEdit={onEdit}
      onDelete={onDelete}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    />
  );
}

export function ItineraryDayColumn({
  day,
  items,
  authorLookup,
  currentUserId,
  canEditOthers,
  votesByItem,
  onToggleVote,
  onReorder,
  onAdd,
  onEdit,
  onDelete,
}: {
  day: string;
  items: ItineraryItem[];
  authorLookup: Map<string, { name: string; color?: string }>;
  currentUserId: string;
  canEditOthers: boolean;
  votesByItem: Map<string, { user_id: string }[]>;
  onToggleVote: (itemId: string) => void;
  onReorder: (moved: ItineraryItem, newPosition: number) => void;
  onAdd: (values: ItineraryFormValues) => Promise<void>;
  onEdit: (item: ItineraryItem, values: ItineraryFormValues) => Promise<void>;
  onDelete: (item: ItineraryItem) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const moved = items[oldIndex];

    let newPosition: number;
    if (newIndex === 0) {
      newPosition = reordered[1].position - 1;
    } else if (newIndex === reordered.length - 1) {
      newPosition = reordered[newIndex - 1].position + 1;
    } else {
      const before = reordered[newIndex - 1].position;
      const after = reordered[newIndex + 1].position;
      newPosition = (before + after) / 2;
    }

    onReorder(moved, newPosition);
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">{formatDay(day)}</h2>
        <Button variant="ghost" size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          Add item
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <ItineraryItemForm
            key="add-form"
            day={day}
            onCancel={() => setAdding(false)}
            onSubmit={async (values) => {
              await onAdd(values);
              setAdding(false);
            }}
          />
        )}
      </AnimatePresence>

      {items.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center">
          <p className="text-sm text-ink-soft">No plans yet, add the first one.</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((item) =>
                editingId === item.id ? (
                  <ItineraryItemForm
                    key={item.id}
                    day={day}
                    initial={item}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async (values) => {
                      await onEdit(item, values);
                      setEditingId(null);
                    }}
                  />
                ) : (
                  (() => {
                    const itemVotes = votesByItem.get(item.id) ?? [];
                    return (
                      <SortableItem
                        key={item.id}
                        item={item}
                        authorName={authorLookup.get(item.created_by)?.name}
                        authorColor={authorLookup.get(item.created_by)?.color}
                        voteCount={itemVotes.length}
                        votedByMe={itemVotes.some((v) => v.user_id === currentUserId)}
                        voters={itemVotes.map((v) => authorLookup.get(v.user_id) ?? { name: "Someone" })}
                        canEdit={item.created_by === currentUserId || canEditOthers}
                        onToggleVote={() => onToggleVote(item.id)}
                        onEdit={() => setEditingId(item.id)}
                        onDelete={() => onDelete(item)}
                      />
                    );
                  })()
                ),
              )}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>
    </Card>
  );
}
