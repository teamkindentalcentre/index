import Link from "next/link";
import { redirect } from "next/navigation";
import { getAllRooms } from "@/lib/queries";
import { getRoomTheme } from "@/lib/theme";
import { hasManageAccess } from "@/lib/manage-auth";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  if (!(await hasManageAccess())) {
    redirect("/manage/pin?next=" + encodeURIComponent("/manage"));
  }

  const rooms = getAllRooms();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="text-xl font-semibold text-slate-900">
        Edit checklist
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Rename drawers/cabinets, add or remove items, and reorder the
        checklist for each room.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {rooms.map((room) => {
          const theme = getRoomTheme(room.id);
          return (
            <Link
              key={room.id}
              href={`/manage/${room.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:bg-slate-50"
            >
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${theme.chip}`}
              >
                {room.name}
              </span>
              <span className="text-sm text-slate-400">Edit &rarr;</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
