import fs from "node:fs";
import path from "node:path";
import { getItemPhotosDir } from "@/lib/paths";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/gif": ".gif",
};

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export function isSupportedImageMime(mime: string): boolean {
  return mime in MIME_EXT;
}

export function itemPhotoFileName(itemId: number, mime: string): string {
  const ext = MIME_EXT[mime] || "";
  return `${itemId}-${Date.now()}${ext}`;
}

export function writeItemPhotoFile(fileName: string, buffer: Buffer): string {
  const dir = getItemPhotosDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), buffer);
  return fileName;
}

export function readItemPhotoFile(fileName: string): Buffer | null {
  const filePath = path.join(getItemPhotosDir(), fileName);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function deleteItemPhotoFile(fileName: string): void {
  const filePath = path.join(getItemPhotosDir(), fileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
