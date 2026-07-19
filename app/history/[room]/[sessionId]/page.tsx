import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionDetail } from "@/lib/queries";
import { getRoomTheme } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";
import { MissingItemPhoto } from "@/components/MissingItemPhoto";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ room: string; sessionId: string }>;
}) {
  const { room: roomId, sessionId } = await params;
  const numericId = Number(sessionId);
  if (!Number.isInteger(numericId)) notFound();

  const session = getSessionDetail(numericId);
  if (!session || session.roomId !== roomId) notFound();

  const theme = getRoomTheme(session.roomId);
  const missing = session.results.filter((r) => !r.present);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link
        href={`/history/${roomId}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        &larr; {session.room.name} history
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${theme.chip}`}
        >
          {session.room.name}
        </span>
        {missing.length === 0 ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            All present
          </span>
        ) : (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            {missing.length} missing
          </span>
        )}
      </div>

      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        {formatDateTime(session.startedAt)}
      </h1>
      <p className="text-sm text-slate-600">
        Checked by {session.staffName} &middot; {session.totalItems} items
      </p>

      {missing.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-semibold text-slate-800">
            Missing / flagged items
          </h2>
          <ul className="mt-2 divide-y divide-red-100 overflow-hidden rounded-xl border border-red-200 bg-red-50">
            {missing.map((result) => (
              <li key={result.itemId} className="px-4 py-3">
                <p className="text-sm font-medium text-slate-800">
                  {result.itemName}
                </p>
                <p className="text-xs text-slate-500">
                  {result.sectionName}
                  {result.expectedQty ? ` · Qty: ${result.expectedQty}` : ""}
                </p>
                {result.note && (
                  <p className="mt-1 text-sm text-red-700">
                    Note: {result.note}
                  </p>
                )}
                <MissingItemPhoto
                  itemId={result.itemId}
                  itemName={result.itemName}
                  hasPhoto={result.hasPhoto}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-800 marker:content-none">
          Show all {session.results.length} items
        </summary>
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {session.results.map((result) => (
            <li
              key={result.itemId}
              className="flex items-center justify-between gap-3 px-4 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-800">
                  {result.itemName}
                </p>
                <p className="text-xs text-slate-500">{result.sectionName}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  result.present
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {result.present ? "Present" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
