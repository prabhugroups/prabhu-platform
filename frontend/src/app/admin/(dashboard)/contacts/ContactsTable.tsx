"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteContact } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface Contact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  created_at: string;
}

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      await deleteContact(id);
      toast.success("Submission deleted.");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-3">
      {contacts.length === 0 && <p className="text-muted-foreground">No submissions yet.</p>}
      {contacts.map((c) => (
        <Card key={c.id}>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {c.name} {c.subject && <span className="font-normal text-muted-foreground">— {c.subject}</span>}
                </p>
                <p className="text-sm text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget(c)}
                disabled={pending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
            {c.message && <p className="mt-2 whitespace-pre-line text-sm">{c.message}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
          </CardContent>
        </Card>
      ))}

      {deleteTarget && (
        <AlertDialog open onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
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
