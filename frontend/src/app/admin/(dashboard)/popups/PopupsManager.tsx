"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { mediaUrl } from "@/lib/media-url-client";
import { uploadMedia } from "@/lib/admin/generic-actions";
import type { Popup } from "@/lib/types";
import { activatePopup, createPopup, deletePopup } from "./actions";

/** A single popup can be active at a time — matches the legacy CRM's
 * enforced single-active-item constraint (see backend
 * app/modules/popup/router.py:activate_popup). */
export function PopupsManager({ popups }: { popups: Popup[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const path = await uploadMedia("popups", fd);
      await createPopup(path);
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleActivate(id: number) {
    startTransition(async () => {
      await activatePopup(id);
      router.refresh();
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this popup?")) return;
    startTransition(async () => {
      await deletePopup(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Popup</h1>
        <label className="flex cursor-pointer items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={16} /> {uploading ? "Uploading..." : "Add Popup"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleUpload} />
        </label>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {popups.length === 0 && <p className="text-gray-500">No popups yet.</p>}
        {popups.map((popup) => {
          const src = mediaUrl(popup.image);
          return (
            <div key={popup.id} className="overflow-hidden rounded-lg border bg-white">
              <div className="aspect-square bg-gray-50">
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex items-center justify-between p-3">
                {popup.status ? (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => handleActivate(popup.id)}
                    disabled={pending}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => handleDelete(popup.id)}
                  disabled={pending}
                  className="rounded p-1 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
