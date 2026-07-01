"use client";

import { useState } from "react";
import { X } from "lucide-react";

/** A thumbnail that opens the full-size image in an overlay when clicked. */
export function ImageLightbox({
  src,
  alt,
  thumbClassName,
}: {
  src: string;
  alt?: string;
  thumbClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className={`cursor-zoom-in ${thumbClassName ?? ""}`}
      />
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={24} />
          </button>
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded object-contain"
          />
        </div>
      )}
    </>
  );
}
