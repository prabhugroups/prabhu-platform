"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { addGalleryImage, createGallery, deleteGallery, deleteGalleryImage } from "./actions";
import { uploadMedia } from "@/lib/admin/generic-actions";
import { mediaUrl } from "@/lib/media-url-client";
import type { Gallery } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function GalleryManager({ galleries }: { galleries: Gallery[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaType, setMediaType] = useState<"Gallery" | "Video">("Gallery");
  const [deleteTarget, setDeleteTarget] = useState<Gallery | null>(null);

  function handleCreate(formData: FormData) {
    const title = String(formData.get("title") ?? "");
    const date = (formData.get("date") as string) || null;
    startTransition(async () => {
      await createGallery(title, date);
      toast.success("Album created.");
      setCreating(false);
      router.refresh();
    });
  }

  function handleDeleteGallery() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      await deleteGallery(id);
      toast.success("Album deleted.");
      setDeleteTarget(null);
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
      await addGalleryImage(galleryId, path, mediaType);
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
        <Button onClick={() => setCreating(true)}>
          <Plus /> New Album
        </Button>
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        value={mediaType}
        onValueChange={(v) => v && setMediaType(v as "Gallery" | "Video")}
        className="mt-4"
      >
        <ToggleGroupItem value="Gallery">Image</ToggleGroupItem>
        <ToggleGroupItem value="Video">Video</ToggleGroupItem>
      </ToggleGroup>

      <div className="mt-6">
        {galleries.length === 0 && <p className="text-muted-foreground">No albums yet.</p>}
        {galleries.length > 0 && (
          <Accordion type="single" collapsible className="rounded-lg border">
            {galleries.map((gallery) => (
              <AccordionItem key={gallery.id} value={String(gallery.id)} className="px-4 last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <AccordionTrigger className="w-full">
                      {gallery.title}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({gallery.images.filter((i) => i.type === mediaType).length}{" "}
                        {mediaType === "Video" ? "videos" : "images"})
                      </span>
                    </AccordionTrigger>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(gallery)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
                <AccordionContent>
                  <div className="flex flex-wrap gap-3">
                    {gallery.images
                      .filter((image) => image.type === mediaType)
                      .map((image) => {
                        const src = mediaUrl(image.file);
                        return (
                          <div key={image.id} className="group relative h-20 w-20 overflow-hidden rounded">
                            {src && mediaType === "Video" ? (
                              <video src={src} className="h-full w-full object-cover" />
                            ) : (
                              src && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={src} alt="" className="h-full w-full object-cover" />
                              )
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
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-input text-muted-foreground hover:bg-muted">
                      <UploadCloud size={18} />
                      <span className="text-xs">{uploading ? "..." : "Add"}</span>
                      <input
                        type="file"
                        accept={mediaType === "Video" ? "video/*" : "image/*"}
                        className="hidden"
                        disabled={uploading || pending}
                        onChange={(e) => handleUploadImage(gallery.id, e)}
                      />
                    </label>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Album</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending && <Loader2 className="animate-spin" />}
                {pending ? "Creating..." : "Create Album"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {deleteTarget && (
        <AlertDialog open onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this gallery?</AlertDialogTitle>
              <AlertDialogDescription>All of its images will be deleted too. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteGallery}
                disabled={pending}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {pending && <Loader2 className="animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
