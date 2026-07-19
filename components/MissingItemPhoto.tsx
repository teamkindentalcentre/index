"use client";

import { useState } from "react";
import { PhotoLightbox } from "@/components/PhotoLightbox";

export function MissingItemPhoto({
  itemId,
  itemName,
  hasPhoto,
}: {
  itemId: number;
  itemName: string;
  hasPhoto: boolean;
}) {
  const [missing, setMissing] = useState(!hasPhoto);
  const [open, setOpen] = useState(false);
  const photoUrl = `/api/item-photos/${itemId}`;

  if (missing) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt=""
        onClick={() => setOpen(true)}
        onError={() => setMissing(true)}
        className="mt-2 h-16 w-16 cursor-pointer rounded-lg border border-red-200 object-cover"
      />
      {open && (
        <PhotoLightbox
          photoUrl={photoUrl}
          itemName={itemName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
