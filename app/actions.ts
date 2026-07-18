"use server";

import { revalidatePath } from "next/cache";
import {
  getRoom,
  submitCheckSession,
  type SubmitResultInput,
} from "@/lib/queries";

export async function submitCheck(
  roomId: string,
  staffName: string,
  results: SubmitResultInput[],
): Promise<number> {
  const room = getRoom(roomId);
  if (!room) throw new Error("Unknown room");

  const trimmedName = staffName.trim();
  if (!trimmedName) throw new Error("Staff name is required");
  if (results.length === 0) throw new Error("No items to submit");

  const sessionId = submitCheckSession(roomId, trimmedName, results);

  revalidatePath("/");
  revalidatePath(`/history/${roomId}`);

  return sessionId;
}
