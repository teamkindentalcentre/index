import { notFound, redirect } from "next/navigation";
import { getRoomChecklist } from "@/lib/queries";
import { hasManageAccess } from "@/lib/manage-auth";
import { ManageClient } from "@/components/ManageClient";

export const dynamic = "force-dynamic";

export default async function ManageRoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room: roomId } = await params;

  if (!(await hasManageAccess())) {
    redirect(
      "/manage/pin?next=" + encodeURIComponent(`/manage/${roomId}`),
    );
  }

  const checklist = getRoomChecklist(roomId);
  if (!checklist) notFound();

  return <ManageClient checklist={checklist} />;
}
