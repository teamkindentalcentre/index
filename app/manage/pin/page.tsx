import { redirect } from "next/navigation";
import { hasManageAccess } from "@/lib/manage-auth";
import { verifyManagePinAction } from "@/app/manage-actions";

export default async function ManagePinPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/manage", error } = await searchParams;

  if (await hasManageAccess()) {
    redirect(next);
  }

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900">
        Enter management PIN
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Editing the checklist (drawers, items) is PIN-protected.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Incorrect PIN. Please try again.
        </p>
      )}

      <form action={verifyManagePinAction} className="mt-6">
        <input type="hidden" name="next" value={next} />
        <label
          htmlFor="pin"
          className="block text-sm font-medium text-slate-700"
        >
          PIN
        </label>
        <input
          id="pin"
          type="password"
          name="pin"
          inputMode="numeric"
          autoFocus
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="mt-4 min-h-12 w-full rounded-lg bg-slate-900 px-4 py-3 text-center text-base font-semibold text-white"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
