"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

const STORAGE_KEY = "popupLastShown";
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/** Shows at most once per 15 minutes per browser — ported from
 * prabhucablecar-web's client-layout.tsx popup logic. */
function shouldShowPopup(): boolean {
  try {
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (!lastShown) return true;
    return Date.now() - parseInt(lastShown, 10) >= FIFTEEN_MINUTES_MS;
  } catch {
    return true;
  }
}

export function PopupModal({ imageUrl }: { imageUrl: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shouldShowPopup()) {
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch {
        // ignore — private browsing / blocked storage, still show the popup
      }
      // localStorage is only readable client-side, so this can't be derived
      // during the initial render (would mismatch the server-rendered
      // markup) — it has to happen post-mount, in an effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
  }, []);

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
