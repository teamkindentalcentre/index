import {
  MAX_PHOTO_BYTES,
  deleteItemPhotoFile,
  isSupportedImageMime,
  itemPhotoFileName,
  readItemPhotoFile,
  writeItemPhotoFile,
} from "@/lib/photos";
import { getItemPhoto, setItemPhoto } from "@/lib/queries";

export const dynamic = "force-dynamic";

function parseItemId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId: rawItemId } = await params;
  const itemId = parseItemId(rawItemId);
  if (itemId === null) return new Response("Not found", { status: 404 });

  const photo = getItemPhoto(itemId);
  if (!photo || !photo.photoPath || !photo.photoMime) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = readItemPhotoFile(photo.photoPath);
  if (!buffer) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": photo.photoMime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId: rawItemId } = await params;
  const itemId = parseItemId(rawItemId);
  if (itemId === null) {
    return Response.json({ error: "Invalid item" }, { status: 404 });
  }

  const existing = getItemPhoto(itemId);
  if (!existing) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return Response.json({ error: "No photo provided" }, { status: 400 });
  }
  if (!isSupportedImageMime(file.type)) {
    return Response.json(
      { error: "Unsupported image type" },
      { status: 400 },
    );
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return Response.json(
      { error: "Photo is too large (max 8MB)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = itemPhotoFileName(itemId, file.type);
  writeItemPhotoFile(fileName, buffer);

  if (existing.photoPath) {
    deleteItemPhotoFile(existing.photoPath);
  }

  setItemPhoto(itemId, fileName, file.type);

  return Response.json({ ok: true });
}
