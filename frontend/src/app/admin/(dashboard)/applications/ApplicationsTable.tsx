"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Trash2 } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { mediaUrl } from "@/lib/media-url-client";
import { deleteApplication, updateApplicationStatus } from "./actions";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface Application {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  citizenship_file: string | null;
  bank_deposit_file: string | null;
  request_form_file: string | null;
  share_type: string | null;
  pan: string | null;
  nid: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const STATUS_STYLE: Record<Application["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [zipping, setZipping] = useState<number | null>(null);
  const [shareTypeFilter, setShareTypeFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);

  const shareTypes = useMemo(() => {
    const set = new Set<string>();
    for (const a of applications) if (a.share_type) set.add(a.share_type);
    return Array.from(set).sort();
  }, [applications]);

  const filtered =
    shareTypeFilter === "all" ? applications : applications.filter((a) => a.share_type === shareTypeFilter);

  async function handleExportZip(app: Application) {
    const files: { label: string; path: string | null }[] = [
      { label: "citizenship", path: app.citizenship_file },
      { label: "bank-deposit", path: app.bank_deposit_file },
      { label: "request-form", path: app.request_form_file },
    ];
    const available = files.filter((f): f is { label: string; path: string } => Boolean(f.path));
    if (available.length === 0) {
      toast.error("No documents uploaded for this application.");
      return;
    }
    setZipping(app.id);
    try {
      const zip = new JSZip();
      for (const f of available) {
        const url = mediaUrl(f.path);
        if (!url) continue;
        const res = await fetch(url);
        const blob = await res.blob();
        const extension = f.path.split(".").pop() ?? "bin";
        zip.file(`${f.label}.${extension}`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${app.name.replace(/\s+/g, "-")}-documents.zip`);
    } finally {
      setZipping(null);
    }
  }

  function handleStatusChange(id: number, status: Application["status"]) {
    startTransition(async () => {
      await updateApplicationStatus(id, status);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      await deleteApplication(id);
      toast.success("Application deleted.");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-6">
      {shareTypes.length > 0 && (
        <ToggleGroup
          type="single"
          variant="outline"
          value={shareTypeFilter}
          onValueChange={(v) => setShareTypeFilter(v || "all")}
          className="mb-4 flex-wrap"
        >
          <ToggleGroupItem value="all">All Share Types</ToggleGroupItem>
          {shareTypes.map((t) => (
            <ToggleGroupItem key={t} value={t}>
              {t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Share Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No applications yet.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {[a.email, a.phone].filter(Boolean).join(" · ")}
                </TableCell>
                <TableCell>{a.share_type ?? "—"}</TableCell>
                <TableCell>
                  <Select
                    value={a.status}
                    disabled={pending}
                    onValueChange={(v) => handleStatusChange(a.id, v as Application["status"])}
                  >
                    <SelectTrigger
                      size="sm"
                      className={cn(
                        "h-auto w-fit rounded-full border-0 px-2 py-1 text-xs font-medium",
                        STATUS_STYLE[a.status],
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExportZip(a)}
                    disabled={zipping === a.id}
                    title="Download documents as ZIP"
                  >
                    {zipping === a.id ? <Loader2 className="animate-spin" /> : <Download />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(a)}
                    disabled={pending}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {deleteTarget && (
        <AlertDialog open onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this application?</AlertDialogTitle>
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
