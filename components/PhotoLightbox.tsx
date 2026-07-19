"use client";

type Props = {
  photoUrl: string;
  itemName: string;
  onClose: () => void;
  onReplace?: () => void;
};

export function PhotoLightbox({ photoUrl, itemName, onClose, onReplace }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={itemName}
      onClick={onClose}
    >
      <div className="flex items-center justify-between">
        <p className="truncate pr-3 text-sm font-medium text-white">
          {itemName}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-full bg-white/10 text-lg font-semibold text-white hover:bg-white/20"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={itemName}
          className="max-h-full max-w-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {onReplace && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReplace();
          }}
          className="min-h-12 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900"
        >
          Replace photo
        </button>
      )}
    </div>
  );
}
