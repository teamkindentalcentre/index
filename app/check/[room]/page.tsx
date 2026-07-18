import { notFound } from "next/navigation";
import { getRoomChecklist } from "@/lib/queries";
import { CheckClient } from "@/components/CheckClient";

export default async function CheckPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room: roomId } = await params;
  const checklist = getRoomChecklist(roomId);

  if (!checklist) notFound();

  return <CheckClient checklist={checklist} />;
}
