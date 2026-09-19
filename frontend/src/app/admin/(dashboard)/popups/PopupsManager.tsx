"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mediaUrl } from "@/lib/media-url-client";
import { uploadMedia } from "@/lib/admin/generic-actions";
import type { Popup } from "@/lib/types";
import { activatePopup, createPopup, deletePopup } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

/** A single popup can be active at a time — matches the legacy CRM's
 * enforced single-active-item constraint (see backend
 * app/modules/popup/router.py:activate_popup). */
export function PopupsManager({ popups }: { popups: Popup[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Popup | null>(null);

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

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      await deletePopup(id);
      toast.success("Popup deleted.");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Popup</h1>
        <label className={cn(buttonVariants(), "cursor-pointer", uploading && "pointer-events-none opacity-50")}>
          <Plus /> {uploading ? "Uploading..." : "Add Popup"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleUpload} />
        </label>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {popups.length === 0 && <p className="text-muted-foreground">No popups yet.</p>}
        {popups.map((popup) => {
          const src = mediaUrl(popup.image);
          return (
            <Card key={popup.id} className="overflow-hidden py-0">
              <div className="aspect-square bg-muted">
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex items-center justify-between p-3">
                {popup.status ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                ) : (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => handleActivate(popup.id)}
                    disabled={pending}
                    className="h-auto p-0 text-xs"
                  >
                    Activate
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget(popup)}
                  disabled={pending}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {deleteTarget && (
        <AlertDialog open onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this popup?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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
