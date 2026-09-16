"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UploadCloud, X } from "lucide-react";
import { addGalleryImage, createGallery, deleteGallery, deleteGalleryImage } from "./actions";
import { uploadMedia } from "@/lib/admin/generic-actions";
import { mediaUrl } from "@/lib/media-url-client";
import type { Gallery } from "@/lib/types";

export function GalleryManager({ galleries }: { galleries: Gallery[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [openGalleryId, setOpenGalleryId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleCreate(formData: FormData) {
    const title = String(formData.get("title") ?? "");
    const date = (formData.get("date") as string) || null;
    startTransition(async () => {
      await createGallery(title, date);
      setCreating(false);
      router.refresh();
    });
  }

  function handleDeleteGallery(id: number) {
    if (!confirm("Delete this gallery and all its images?")) return;
    startTransition(async () => {
      await deleteGallery(id);
      router.refresh();
    });
  }

  async function handleUploadImage(galleryId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const path = await uploadMedia("gallery", fd);
      await addGalleryImage(galleryId, path, "Gallery");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function handleDeleteImage(galleryId: number, imageId: number) {
    startTransition(async () => {
      await deleteGalleryImage(galleryId, imageId);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gallery</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> New Album
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {galleries.length === 0 && <p className="text-gray-500">No albums yet.</p>}
        {galleries.map((gallery) => (
          <div key={gallery.id} className="rounded-lg border bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setOpenGalleryId(openGalleryId === gallery.id ? null : gallery.id)}
                className="text-left font-medium"
              >
                {gallery.title}{" "}
                <span className="text-sm font-normal text-gray-400">({gallery.images.length} images)</span>
              </button>
              <button
                onClick={() => handleDeleteGallery(gallery.id)}
                className="rounded p-1.5 text-red-500 hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {openGalleryId === gallery.id && (
              <div className="border-t p-4">
                <div className="flex flex-wrap gap-3">
                  {gallery.images.map((image) => {
                    const src = mediaUrl(image.file);
                    return (
                      <div key={image.id} className="group relative h-20 w-20 overflow-hidden rounded">
                        {src && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        )}
                        <button
                          onClick={() => handleDeleteImage(gallery.id, image.id)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed text-gray-400 hover:bg-gray-50">
                    <UploadCloud size={18} />
                    <span className="text-xs">{uploading ? "..." : "Add"}</span>
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading || pending}
                      onChange={(e) => handleUploadImage(gallery.id, e)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">New Album</h2>
              <button onClick={() => setCreating(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form action={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <input name="title" required className="w-full rounded-md border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Date</label>
                <input name="date" type="date" className="w-full rounded-md border px-3 py-2" />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-primary px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Creating..." : "Create Album"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
