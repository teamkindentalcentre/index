"use client";

import { useState, useSyncExternalStore } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RoomChecklist, ChecklistSection, ChecklistItem } from "@/lib/queries";
import { getRoomTheme } from "@/lib/theme";
import {
  addSectionAction,
  renameSectionAction,
  deleteSectionAction,
  reorderSectionsAction,
  addItemAction,
  updateItemAction,
  deleteItemAction,
  reorderItemsAction,
} from "@/app/manage-actions";

function noopSubscribe() {
  return () => {};
}

// dnd-kit generates ARIA description IDs that can differ between the
// server-rendered HTML and the client's first render, causing a hydration
// warning. Deferring the drag-enabled UI until after the client has mounted
// avoids that; useSyncExternalStore is the hydration-safe way to know that.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

export function ManageClient({ checklist }: { checklist: RoomChecklist }) {
  const { room, sections: initialSections } = checklist;
  const [sections, setSections] = useState<ChecklistSection[]>(initialSections);
  const [newSectionName, setNewSectionName] = useState("");
  const theme = getRoomTheme(room.id);
  const mounted = useMounted();
  const sectionSensors = useDndSensors();

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      reorderSectionsAction(
        room.id,
        next.map((s) => s.id),
      );
      return next;
    });
  }

  function handleItemDragEnd(sectionId: number, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const oldIndex = section.items.findIndex((i) => i.id === active.id);
        const newIndex = section.items.findIndex((i) => i.id === over.id);
        const items = arrayMove(section.items, oldIndex, newIndex);
        reorderItemsAction(
          room.id,
          items.map((i) => i.id),
        );
        return { ...section, items };
      }),
    );
  }

  async function handleRenameSection(sectionId: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await renameSectionAction(room.id, sectionId, trimmed);
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, name: trimmed } : s)),
    );
  }

  async function handleDeleteSection(sectionId: number, name: string) {
    if (!confirm(`Remove "${name}" and all its items from the checklist?`))
      return;
    await deleteSectionAction(room.id, sectionId);
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  async function handleAddSection() {
    const name = newSectionName.trim();
    if (!name) return;
    const id = await addSectionAction(room.id, name);
    setSections((prev) => [...prev, { id, name, items: [] }]);
    setNewSectionName("");
  }

  async function handleAddItem(sectionId: number, name: string, qty: string) {
    if (!name.trim()) return;
    const id = await addItemAction(room.id, sectionId, name, qty);
    const item: ChecklistItem = {
      id,
      name: name.trim(),
      expectedQty: qty.trim() || null,
      sortOrder: 0,
      hasPhoto: false,
    };
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, items: [...s.items, item] } : s,
      ),
    );
  }

  async function handleUpdateItem(
    sectionId: number,
    itemId: number,
    name: string,
    qty: string,
  ) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await updateItemAction(room.id, itemId, trimmed, qty);
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              items: s.items.map((i) =>
                i.id === itemId
                  ? { ...i, name: trimmed, expectedQty: qty.trim() || null }
                  : i,
              ),
            },
      ),
    );
  }

  async function handleDeleteItem(sectionId: number, itemId: number, name: string) {
    if (!confirm(`Remove "${name}" from the checklist?`)) return;
    await deleteItemAction(room.id, itemId);
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, items: s.items.filter((i) => i.id !== itemId) },
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${theme.chip}`}
      >
        {room.name}
      </span>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        Edit checklist
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Drag <span className="font-mono">⠿</span> to reorder. Changes save
        immediately and show up on the next check.
      </p>

      {mounted ? (
        <DndContext
          sensors={sectionSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-5 flex flex-col gap-3">
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  onRename={(name) => handleRenameSection(section.id, name)}
                  onDelete={() =>
                    handleDeleteSection(section.id, section.name)
                  }
                  onItemDragEnd={(e) => handleItemDragEnd(section.id, e)}
                  onAddItem={(name, qty) =>
                    handleAddItem(section.id, name, qty)
                  }
                  onUpdateItem={(itemId, name, qty) =>
                    handleUpdateItem(section.id, itemId, name, qty)
                  }
                  onDeleteItem={(itemId, name) =>
                    handleDeleteItem(section.id, itemId, name)
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="mt-5 text-sm text-slate-400">Loading editor…</div>
      )}

      <div className="mt-4 flex gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-3">
        <input
          type="text"
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder="New drawer/cabinet name"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAddSection}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Add drawer/cabinet
        </button>
      </div>
    </div>
  );
}

function SortableSection({
  section,
  onRename,
  onDelete,
  onItemDragEnd,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: {
  section: ChecklistSection;
  onRename: (name: string) => void;
  onDelete: () => void;
  onItemDragEnd: (event: DragEndEvent) => void;
  onAddItem: (name: string, qty: string) => void;
  onUpdateItem: (itemId: number, name: string, qty: string) => void;
  onDeleteItem: (itemId: number, name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const itemSensors = useDndSensors();
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder drawer/cabinet"
            className="cursor-grab touch-none px-1 text-lg text-slate-400 active:cursor-grabbing"
          >
            ⠿
          </button>
          <input
            type="text"
            defaultValue={section.name}
            onBlur={(e) => e.target.value !== section.name && onRename(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 hover:border-slate-200 focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="mt-1 flex justify-end pl-7">
          <button
            type="button"
            onClick={onDelete}
            aria-label="Remove drawer/cabinet"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>

      <DndContext
        sensors={itemSensors}
        collisionDetection={closestCenter}
        onDragEnd={onItemDragEnd}
      >
        <SortableContext
          items={section.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y divide-slate-100">
            {section.items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                onUpdate={(name, qty) => onUpdateItem(item.id, name, qty)}
                onDelete={() => onDeleteItem(item.id, item.name)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 p-3">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="New item name"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          value={newItemQty}
          onChange={(e) => setNewItemQty(e.target.value)}
          placeholder="Qty (optional)"
          className="w-24 shrink-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            onAddItem(newItemName, newItemQty);
            setNewItemName("");
            setNewItemQty("");
          }}
          className="shrink-0 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function SortableItem({
  item,
  onUpdate,
  onDelete,
}: {
  item: ChecklistItem;
  onUpdate: (name: string, qty: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder item"
          className="cursor-grab touch-none px-1 text-slate-400 active:cursor-grabbing"
        >
          ⠿
        </button>
        <input
          type="text"
          defaultValue={item.name}
          onBlur={(e) => {
            if (e.target.value !== item.name) {
              onUpdate(e.target.value, item.expectedQty ?? "");
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1.5 text-sm text-slate-800 hover:border-slate-200 focus:border-blue-400 focus:outline-none"
        />
      </div>
      <div className="mt-1 flex items-center gap-2 pl-7">
        <input
          type="text"
          defaultValue={item.expectedQty ?? ""}
          placeholder="Qty"
          onBlur={(e) => {
            if (e.target.value !== (item.expectedQty ?? "")) {
              onUpdate(item.name, e.target.value);
            }
          }}
          className="w-24 shrink-0 rounded-md border border-transparent px-2 py-1.5 text-sm text-slate-600 hover:border-slate-200 focus:border-blue-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onDelete}
          aria-label="Remove item"
          className="ml-auto shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
