"use client";

import { useRef, useState } from "react";
import { PhotoLightbox } from "@/components/PhotoLightbox";

type Props = {
  itemId: number;
  name: string;
  expectedQty: string | null;
  hasPhoto: boolean;
  present: boolean | null;
  note: string;
  onSetPresent: (present: boolean) => void;
  onNoteChange: (note: string) => void;
};

export function ItemRow({
  itemId,
  name,
  expectedQty,
  hasPhoto,
  present,
  note,
  onSetPresent,
  onNoteChange,
}: Props) {
  const [photoMissing, setPhotoMissing] = useState(!hasPhoto);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photoUrl = `/api/item-photos/${itemId}?v=${photoVersion}`;

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/item-photos/${itemId}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Upload failed");
      }
      setPhotoMissing(false);
      setPhotoVersion((v) => v + 1);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload photo.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {!photoMissing && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              className="h-full w-full cursor-pointer object-cover"
              onClick={() => setLightboxOpen(true)}
              onError={() => setPhotoMissing(true)}
            />
          )}
          {photoMissing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Add photo"
              className="flex h-full w-full items-center justify-center text-slate-400 hover:bg-slate-100"
            >
              {uploading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-slate-800">
            {name}
          </p>
          {expectedQty && (
            <p className="text-xs text-slate-500">Qty: {expectedQty}</p>
          )}
          {uploadError && (
            <p className="text-xs text-red-600">{uploadError}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onSetPresent(true)}
            aria-pressed={present === true}
            className={`min-h-11 min-w-20 rounded-lg border px-3 text-sm font-semibold transition-colors ${
              present === true
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Present
          </button>
          <button
            type="button"
            onClick={() => onSetPresent(false)}
            aria-pressed={present === false}
            className={`min-h-11 min-w-20 rounded-lg border px-3 text-sm font-semibold transition-colors ${
              present === false
                ? "border-red-600 bg-red-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Missing
          </button>
        </div>
      </div>

      {present === false && (
        <input
          type="text"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Optional note (e.g. broken, on order)"
          className="mt-2 w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm placeholder:text-red-400 focus:border-red-400 focus:outline-none"
        />
      )}

      {lightboxOpen && !photoMissing && (
        <PhotoLightbox
          photoUrl={photoUrl}
          itemName={name}
          onClose={() => setLightboxOpen(false)}
          onReplace={() => {
            setLightboxOpen(false);
            fileInputRef.current?.click();
          }}
        />
      )}
    </li>
  );
}
