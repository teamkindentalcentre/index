"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireManageAccess, setManageCookie } from "@/lib/manage-auth";
import {
  addSection as addSectionQuery,
  renameSection as renameSectionQuery,
  deleteSection as deleteSectionQuery,
  reorderSections as reorderSectionsQuery,
  addItem as addItemQuery,
  updateItem as updateItemQuery,
  deleteItem as deleteItemQuery,
  reorderItems as reorderItemsQuery,
} from "@/lib/queries";

export async function verifyManagePinAction(formData: FormData) {
  const pin = String(formData.get("pin") || "");
  const next = String(formData.get("next") || "/manage");
  const expected = process.env.MANAGE_PIN;

  if (expected && pin !== expected) {
    redirect(`/manage/pin?next=${encodeURIComponent(next)}&error=1`);
  }
  if (expected) {
    await setManageCookie(pin);
  }
  redirect(next);
}

function revalidateRoom(roomId: string) {
  revalidatePath(`/check/${roomId}`);
  revalidatePath(`/manage/${roomId}`);
}

export async function addSectionAction(
  roomId: string,
  name: string,
): Promise<number> {
  await requireManageAccess();
  if (!name.trim()) throw new Error("Drawer/cabinet name is required");
  const id = addSectionQuery(roomId, name);
  revalidateRoom(roomId);
  return id;
}

export async function renameSectionAction(
  roomId: string,
  sectionId: number,
  name: string,
) {
  await requireManageAccess();
  if (!name.trim()) throw new Error("Drawer/cabinet name is required");
  renameSectionQuery(sectionId, name);
  revalidateRoom(roomId);
}

export async function deleteSectionAction(roomId: string, sectionId: number) {
  await requireManageAccess();
  deleteSectionQuery(sectionId);
  revalidateRoom(roomId);
}

export async function reorderSectionsAction(
  roomId: string,
  orderedSectionIds: number[],
) {
  await requireManageAccess();
  reorderSectionsQuery(orderedSectionIds);
  revalidateRoom(roomId);
}

export async function addItemAction(
  roomId: string,
  sectionId: number,
  name: string,
  expectedQty: string,
): Promise<number> {
  await requireManageAccess();
  if (!name.trim()) throw new Error("Item name is required");
  const id = addItemQuery(sectionId, name, expectedQty || null);
  revalidateRoom(roomId);
  return id;
}

export async function updateItemAction(
  roomId: string,
  itemId: number,
  name: string,
  expectedQty: string,
) {
  await requireManageAccess();
  if (!name.trim()) throw new Error("Item name is required");
  updateItemQuery(itemId, name, expectedQty || null);
  revalidateRoom(roomId);
}

export async function deleteItemAction(roomId: string, itemId: number) {
  await requireManageAccess();
  deleteItemQuery(itemId);
  revalidateRoom(roomId);
}

export async function reorderItemsAction(
  roomId: string,
  orderedItemIds: number[],
) {
  await requireManageAccess();
  reorderItemsQuery(orderedItemIds);
  revalidateRoom(roomId);
}
