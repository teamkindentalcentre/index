"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RoomChecklist } from "@/lib/queries";
import { getRoomTheme } from "@/lib/theme";
import { submitCheck } from "@/app/actions";
import { ItemRow } from "@/components/ItemRow";
import { ProgressBar } from "@/components/ProgressBar";

type Answer = { present: boolean | null; note: string };

export function CheckClient({ checklist }: { checklist: RoomChecklist }) {
  const { room, sections } = checklist;
  const theme = getRoomTheme(room.id);
  const router = useRouter();

  const [step, setStep] = useState<"intro" | "checking">("intro");
  const [staffName, setStaffName] = useState("");
  const [answers, setAnswers] = useState<Record<number, Answer>>(() => {
    const initial: Record<number, Answer> = {};
    for (const section of sections) {
      for (const item of section.items) {
        initial[item.id] = { present: null, note: "" };
      }
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allItems = useMemo(
    () => sections.flatMap((s) => s.items),
    [sections],
  );
  const totalItems = allItems.length;
  const checkedCount = allItems.filter(
    (item) => answers[item.id]?.present !== null,
  ).length;
  const allAnswered = checkedCount === totalItems;

  function setPresent(itemId: number, present: boolean) {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { present, note: present ? "" : prev[itemId]?.note ?? "" },
    }));
  }

  function setNote(itemId: number, note: string) {
    setAnswers((prev) => ({ ...prev, [itemId]: { ...prev[itemId], note } }));
  }

  function markAllRemainingPresent() {
    setAnswers((prev) => {
      const next = { ...prev };
      for (const item of allItems) {
        if (next[item.id].present === null) {
          next[item.id] = { present: true, note: "" };
        }
      }
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (!allAnswered) {
      setError("Please mark every item as Present or Missing before finishing.");
      return;
    }
    setSubmitting(true);
    try {
      const results = allItems.map((item) => ({
        itemId: item.id,
        present: answers[item.id].present as boolean,
        note: answers[item.id].note,
      }));
      const sessionId = await submitCheck(room.id, staffName, results);
      router.push(`/history/${room.id}/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (step === "intro") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <span
          className={`mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-medium ${theme.chip}`}
        >
          {room.name}
        </span>
        <h1 className="text-xl font-semibold text-slate-900">
          Start stock &amp; equipment check
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {totalItems} items across {sections.length} drawers/cabinets.
        </p>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Your name
        </label>
        <input
          type="text"
          value={staffName}
          onChange={(e) => setStaffName(e.target.value)}
          placeholder="Staff name"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
          autoFocus
        />

        <button
          type="button"
          disabled={!staffName.trim()}
          onClick={() => setStep("checking")}
          className={`mt-6 min-h-12 rounded-lg px-4 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${theme.accent}`}
        >
          Start check
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <div className="mx-auto w-full max-w-2xl px-4 pt-4">
        <div className="mb-1 flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${theme.chip}`}
          >
            {room.name}
          </span>
          <span className="text-sm text-slate-500">{staffName}</span>
        </div>
        <ProgressBar checked={checkedCount} total={totalItems} />

        <button
          type="button"
          onClick={markAllRemainingPresent}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Mark all remaining as Present
        </button>
      </div>

      <div className="mx-auto mt-4 w-full max-w-2xl flex-1 space-y-3 px-4">
        {sections.map((section) => {
          const sectionChecked = section.items.filter(
            (item) => answers[item.id]?.present !== null,
          ).length;
          return (
            <details
              key={section.id}
              open
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 marker:content-none">
                <span>{section.name}</span>
                <span className="text-xs font-normal text-slate-400">
                  {sectionChecked}/{section.items.length}
                </span>
              </summary>
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {section.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    name={item.name}
                    expectedQty={item.expectedQty}
                    present={answers[item.id]?.present ?? null}
                    note={answers[item.id]?.note ?? ""}
                    onSetPresent={(present) => setPresent(item.id, present)}
                    onNoteChange={(note) => setNote(item.id, note)}
                  />
                ))}
              </ul>
            </details>
          );
        })}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={submitting || !allAnswered}
            onClick={handleSubmit}
            className={`w-full min-h-12 rounded-lg px-4 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${theme.accent}`}
          >
            {submitting
              ? "Submitting..."
              : allAnswered
                ? "Finish check"
                : `Finish check (${totalItems - checkedCount} left)`}
          </button>
        </div>
      </div>
    </div>
  );
}
