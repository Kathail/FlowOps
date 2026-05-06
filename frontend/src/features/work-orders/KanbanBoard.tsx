import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Link } from "react-router-dom";
import { transitionWorkOrder, type WoStatus, type WorkOrderListItem } from "./api";

const ACTIVE_COLUMNS: { id: WoStatus; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "open", label: "Open" },
  { id: "assigned", label: "Assigned" },
  { id: "in_progress", label: "In progress" },
  { id: "on_hold", label: "On hold" },
];

interface Props {
  items: WorkOrderListItem[];
  slug: string;
}

export function KanbanBoard({ items, slug }: Props) {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const grouped = useMemo(() => {
    const m: Record<string, WorkOrderListItem[]> = {};
    for (const c of ACTIVE_COLUMNS) m[c.id] = [];
    for (const wo of items) {
      if (m[wo.status]) m[wo.status].push(wo);
    }
    return m;
  }, [items]);

  const transition = useMutation({
    mutationFn: ({ wo_number, to }: { wo_number: string; to: WoStatus }) =>
      transitionWorkOrder(wo_number, to),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
    },
  });

  function onDragEnd(event: DragEndEvent) {
    const wo_number = String(event.active.id);
    const to = event.over?.id as WoStatus | undefined;
    if (!to) return;
    const current = items.find((i) => i.wo_number === wo_number);
    if (!current || current.status === to) return;
    transition.mutate({ wo_number, to });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {/* Edge fade hints there's more content when columns scroll horizontally —
          fixed-width cards inside overflow-x-auto have no visible scrollbar
          on most modern browsers, so without a fade the right side just clips. */}
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{
          maskImage:
            "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)",
        }}
      >
        {ACTIVE_COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            items={grouped[col.id] ?? []}
            slug={slug}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  id,
  label,
  items,
  slug,
}: {
  id: WoStatus;
  label: string;
  items: WorkOrderListItem[];
  slug: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`col-${id}-heading`}
      className={`flex flex-col w-72 shrink-0 rounded-lg border transition-colors ${
        isOver ? "border-blue-500/60 bg-blue-500/5" : "border-slate-800 bg-slate-900"
      }`}
    >
      <header className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <h3 id={`col-${id}-heading`} className="text-sm font-medium text-slate-200">
          {label}
        </h3>
        <span className="text-xs text-slate-400">{items.length}</span>
      </header>
      <ul className="flex-1 p-2 space-y-2 min-h-32">
        {items.map((wo) => (
          <Card key={wo.wo_number} wo={wo} slug={slug} />
        ))}
        {items.length === 0 && <li className="text-xs text-slate-400 text-center py-4">Empty</li>}
      </ul>
    </section>
  );
}

function Card({ wo, slug }: { wo: WorkOrderListItem; slug: string }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: wo.wo_number,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded border bg-slate-900 px-2 py-1.5 text-sm cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 shadow-md" : "border-slate-800 hover:border-slate-700"
      }`}
    >
      <Link
        to={`/${slug}/work-orders/${wo.wo_number}`}
        className="font-mono text-xs text-slate-400 hover:underline block"
        onClick={(e) => e.stopPropagation()}
      >
        {wo.wo_number}
      </Link>
      <p className="mt-0.5 text-slate-100 line-clamp-2">{wo.title}</p>
      <p className="mt-1 text-xs text-slate-400">
        {wo.priority} · {wo.category}
      </p>
    </li>
  );
}
