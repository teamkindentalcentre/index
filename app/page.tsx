import Link from "next/link";
import { getAllRooms, getLatestSessionForRoom } from "@/lib/queries";
import { getRoomTheme } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Home() {
  const rooms = getAllRooms();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <p className="mb-6 text-slate-600">
        Pick a room to start a stock &amp; equipment check, or review past
        checks.
      </p>

      <div className="flex flex-col gap-4">
        {rooms.map((room) => {
          const theme = getRoomTheme(room.id);
          const latest = getLatestSessionForRoom(room.id);

          return (
            <div
              key={room.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${theme.chip}`}
                >
                  {room.name}
                </span>
              </div>

              <div className="mt-3 text-sm text-slate-600">
                {latest ? (
                  <p>
                    Last check:{" "}
                    <span className="font-medium text-slate-800">
                      {formatDateTime(latest.startedAt)}
                    </span>{" "}
                    by {latest.staffName} —{" "}
                    {latest.missingCount === 0 ? (
                      <span className="text-emerald-700">
                        all {latest.totalItems} items present
                      </span>
                    ) : (
                      <span className="font-medium text-red-600">
                        {latest.missingCount} item
                        {latest.missingCount === 1 ? "" : "s"} missing
                      </span>
                    )}
                  </p>
                ) : (
                  <p>No checks recorded yet.</p>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <Link
                  href={`/check/${room.id}`}
                  className={`flex-1 rounded-lg px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors ${theme.accent}`}
                >
                  Start check
                </Link>
                <Link
                  href={`/history/${room.id}`}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  History
                </Link>
              </div>
              <Link
                href={`/manage/${room.id}`}
                className="mt-2 block text-center text-xs text-slate-400 hover:text-slate-600"
              >
                Edit checklist
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
