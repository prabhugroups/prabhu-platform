"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

export function PopupModal({ imageUrl }: { imageUrl: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => setOpen(false)}
    >
      <div className="relative max-h-[85vh] max-w-lg" onClick={(e) => e.stopPropagation()}>
        <button
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute -right-3 -top-3 rounded-full bg-white p-1 shadow"
        >
          <X size={20} />
        </button>
        <Image
          src={imageUrl}
          alt="Announcement"
          width={600}
          height={800}
          className="h-auto max-h-[85vh] w-auto rounded-lg object-contain"
        />
      </div>
    </div>
  );
}
