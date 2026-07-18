import Link from "next/link";
import { notFound } from "next/navigation";
import { getRoom, getSessionsForRoom } from "@/lib/queries";
import { getRoomTheme } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";

export default async function RoomHistoryPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room: roomId } = await params;
  const room = getRoom(roomId);
  if (!room) notFound();

  const sessions = getSessionsForRoom(roomId);
  const theme = getRoomTheme(room.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${theme.chip}`}
      >
        {room.name}
      </span>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        Check history
      </h1>

      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No checks recorded yet for this room.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/history/${room.id}/${session.id}`}
                className="block rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">
                    {formatDateTime(session.startedAt)}
                  </span>
                  {session.missingCount === 0 ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      All present
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {session.missingCount} missing
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {session.staffName} &middot; {session.totalItems} items
                  checked
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
