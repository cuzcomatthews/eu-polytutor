import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import type { ExerciseProps } from "./types";

function SortableItem({ id, label, pos }: { id: number; label: string; pos: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-sm font-medium select-none"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-drag-handle]")) return;
        e.preventDefault();
      }}
    >
      <span
        {...attributes}
        {...listeners}
        data-drag-handle
        className="cursor-grab active:cursor-grabbing touch-none px-1 py-0.5 rounded opacity-40 hover:opacity-80 text-lg select-none"
      >
        ⋮⋮
      </span>
      <span className="w-6 text-center text-xs font-bold opacity-40">{pos + 1}.</span>
      <span className="flex-1">{label}</span>
    </li>
  );
}

export function Ordering({ exercise, onAnswerChange, disabled }: ExerciseProps) {
  const payload = exercise.payload as Record<string, unknown>;
  const items = (payload.items as string[]) ?? [];
  const hint = payload.hint as string | undefined;
  const [order, setOrder] = useState<number[]>(items.map((_, i) => i));

  useEffect(() => {
    onAnswerChange({ order });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(active.id as number);
    const newIdx = order.indexOf(over.id as number);
    const next = [...order];
    [next[oldIdx], next[newIdx]] = [next[newIdx], next[oldIdx]];
    setOrder(next);
    onAnswerChange({ order: next });
  };

  return (
    <div>
      {hint && (
        <p className="text-base font-medium mb-3 p-3 rounded-lg text-center"
          style={{ background: "var(--color-input)", color: "var(--color-sidebar-text)" }}>
          {hint}
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {order.map((itemIdx, posIdx) => (
              <SortableItem
                key={itemIdx}
                id={itemIdx}
                label={items[itemIdx]}
                pos={posIdx}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <p className="text-xs mt-2 opacity-40 text-center">
        Drag handles (⋮⋮) to reorder
      </p>
    </div>
  );
}
