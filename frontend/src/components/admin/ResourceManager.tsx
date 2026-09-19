"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { createResource, deleteResource, updateResource, uploadMedia } from "@/lib/admin/generic-actions";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";
import { mediaUrl } from "@/lib/media-url-client";
import { RichTextEditor } from "@/components/fields/RichTextEditor";
import { NepaliDateInput } from "@/components/fields/NepaliDateInput";
import { UrlInput } from "@/components/fields/UrlInput";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  basePath: string; // e.g. "/admin/teams"
  fields: FieldConfig[];
  items: ResourceRow[];
}

export function ResourceManager({ title, basePath, fields, items }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<ResourceRow | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setEditing(null);
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.type === "checkbox" || field.type === "toggle") {
        data[field.name] = formData.get(field.name) === "on";
      } else if (field.type === "number") {
        const v = formData.get(field.name);
        data[field.name] = v ? Number(v) : null;
      } else if (field.type === "json") {
        const v = formData.get(field.name);
        try {
          data[field.name] = v ? JSON.parse(String(v)) : null;
        } catch {
          setError(`"${field.label}" must be valid JSON.`);
          return;
        }
      } else {
        // "media" fields also land here — their hidden input holds the
        // already-uploaded relative path (see MediaField below).
        const v = formData.get(field.name);
        data[field.name] = v ? String(v) : null;
      }
    }

    startTransition(async () => {
      try {
        const wasNew = editing === "new";
        if (wasNew) {
          await createResource(basePath, currentPath(), data);
        } else if (editing) {
          await updateResource(basePath, editing.id, currentPath(), data);
        }
        toast.success(wasNew ? `${title} created.` : `${title} updated.`);
        close();
        router.refresh();
      } catch {
        setError("Save failed. Please check the fields and try again.");
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      await deleteResource(basePath, id, currentPath());
      toast.success(`${title} deleted.`);
      setDeleteTarget(null);
      router.refresh();
    });
  }

  function currentPath(): string {
    return typeof window !== "undefined" ? window.location.pathname : "/";
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Add
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((f) => (
                <TableHead key={f.name}>{f.label}</TableHead>
              ))}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={fields.length + 1} className="py-8 text-center text-muted-foreground">
                  No items yet.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id}>
                {fields.map((f) => (
                  <TableCell key={f.name} className="max-w-xs truncate">
                    {formatCell(item[f.name], f)}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(item)} aria-label="Edit">
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Delete"
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

      {editing && (
        <Dialog open onOpenChange={(open) => !open && close()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing === "new" ? "Add" : "Edit"} {title}
              </DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {fields.map((f) => (
                <div key={f.name}>
                  {f.type === "checkbox" || f.type === "toggle" ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        id={f.name}
                        name={f.name}
                        defaultChecked={editing !== "new" ? Boolean(editing[f.name]) : false}
                      />
                      <Label htmlFor={f.name}>{f.label}</Label>
                    </div>
                  ) : f.type === "media" ? (
                    <>
                      <Label className="mb-1.5">{f.label}</Label>
                      <MediaField
                        name={f.name}
                        module={f.mediaModule ?? "misc"}
                        initialPath={editing !== "new" ? (editing[f.name] as string | null) : null}
                      />
                    </>
                  ) : f.type === "richtext" ? (
                    <RichTextEditor
                      name={f.name}
                      label={f.label}
                      initialValue={editing !== "new" ? (editing[f.name] as string | null) : null}
                    />
                  ) : f.type === "nepali-date" ? (
                    <NepaliDateInput
                      name={f.name}
                      label={f.label}
                      initialValue={editing !== "new" ? (editing[f.name] as string | null) : null}
                    />
                  ) : f.type === "url" ? (
                    <UrlInput
                      name={f.name}
                      label={f.label}
                      initialValue={editing !== "new" ? (editing[f.name] as string | null) : null}
                    />
                  ) : (
                    <>
                      <Label className="mb-1.5" htmlFor={f.name}>
                        {f.label}
                      </Label>
                      {f.type === "select" ? (
                        <Select
                          name={f.name}
                          required={f.required}
                          defaultValue={
                            editing !== "new" ? String(editing[f.name] ?? "") : (f.options?.[0] ?? "")
                          }
                        >
                          <SelectTrigger id={f.name} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {f.options?.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {f.optionLabels?.[opt] ?? opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : f.type === "textarea" || f.type === "json" ? (
                        <Textarea
                          id={f.name}
                          name={f.name}
                          required={f.required}
                          defaultValue={
                            editing !== "new"
                              ? f.type === "json"
                                ? JSON.stringify(editing[f.name] ?? {}, null, 2)
                                : String(editing[f.name] ?? "")
                              : f.type === "json"
                                ? "{}"
                                : ""
                          }
                          rows={4}
                          className={f.type === "json" ? "font-mono text-xs" : undefined}
                        />
                      ) : (
                        <Input
                          id={f.name}
                          name={f.name}
                          type={f.type}
                          required={f.required}
                          defaultValue={editing !== "new" ? String(editing[f.name] ?? "") : ""}
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button type="submit" disabled={pending} className="w-full">
                  {pending && <Loader2 className="animate-spin" />}
                  {pending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleteTarget && (
        <AlertDialog open onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this item?</AlertDialogTitle>
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

function formatCell(value: unknown, field: FieldConfig): string {
  if (value === null || value === undefined) return "—";
  const { type } = field;
  if (type === "checkbox" || type === "toggle") return value ? "Yes" : "No";
  if (type === "media") return String(value).split("/").pop() ?? String(value);
  if (type === "json") return JSON.stringify(value);
  if (type === "richtext") return String(value).replace(/<[^>]+>/g, " ").trim();
  if (type === "select") return field.optionLabels?.[String(value)] ?? String(value);
  return String(value);
}

export function MediaField({
  name,
  module,
  initialPath,
}: {
  name: string;
  module: string;
  initialPath: string | null;
}) {
  const [path, setPath] = useState<string | null>(initialPath);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const uploaded = await uploadMedia(module, fd);
      setPath(uploaded);
    } finally {
      setUploading(false);
    }
  }

  const previewUrl = mediaUrl(path);

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={path ?? ""} readOnly />
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded media, next/image isn't worth it here
        <img src={previewUrl} alt="" className="h-12 w-12 rounded object-cover" />
      )}
      <label
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "cursor-pointer",
          uploading && "pointer-events-none opacity-50",
        )}
      >
        <UploadCloud />
        {uploading ? "Uploading..." : path ? "Replace" : "Upload"}
        <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
    </div>
  );
}
