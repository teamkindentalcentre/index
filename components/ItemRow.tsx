"use client";

type Props = {
  name: string;
  expectedQty: string | null;
  present: boolean | null;
  note: string;
  onSetPresent: (present: boolean) => void;
  onNoteChange: (note: string) => void;
};

export function ItemRow({
  name,
  expectedQty,
  present,
  note,
  onSetPresent,
  onNoteChange,
}: Props) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-slate-800">
            {name}
          </p>
          {expectedQty && (
            <p className="text-xs text-slate-500">Qty: {expectedQty}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onSetPresent(true)}
            aria-pressed={present === true}
            className={`min-h-11 min-w-20 rounded-lg border px-3 text-sm font-semibold transition-colors ${
              present === true
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Present
          </button>
          <button
            type="button"
            onClick={() => onSetPresent(false)}
            aria-pressed={present === false}
            className={`min-h-11 min-w-20 rounded-lg border px-3 text-sm font-semibold transition-colors ${
              present === false
                ? "border-red-600 bg-red-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Missing
          </button>
        </div>
      </div>

      {present === false && (
        <input
          type="text"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Optional note (e.g. broken, on order)"
          className="mt-2 w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm placeholder:text-red-400 focus:border-red-400 focus:outline-none"
        />
      )}
    </li>
  );
}
