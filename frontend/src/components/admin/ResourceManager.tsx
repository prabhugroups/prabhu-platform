"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { createResource, deleteResource, updateResource, uploadMedia } from "@/lib/admin/generic-actions";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";
import { mediaUrl } from "@/lib/media-url-client";
import { RichTextEditor } from "@/components/fields/RichTextEditor";
import { NepaliDateInput } from "@/components/fields/NepaliDateInput";
import { UrlInput } from "@/components/fields/UrlInput";
import { Toggle } from "@/components/ui/Toggle";

interface Props {
  title: string;
  basePath: string; // e.g. "/admin/teams"
  fields: FieldConfig[];
  items: ResourceRow[];
}

export function ResourceManager({ title, basePath, fields, items }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<ResourceRow | "new" | null>(null);
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
        if (editing === "new") {
          await createResource(basePath, currentPath(), data);
        } else if (editing) {
          await updateResource(basePath, editing.id, currentPath(), data);
        }
        close();
        router.refresh();
      } catch {
        setError("Save failed. Please check the fields and try again.");
      }
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteResource(basePath, id, currentPath());
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
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {fields.map((f) => (
                <th key={f.name} className="px-4 py-3 font-medium">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={fields.length + 1} className="px-4 py-8 text-center text-gray-400">
                  No items yet.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                {fields.map((f) => (
                  <td key={f.name} className="max-w-xs truncate px-4 py-3">
                    {formatCell(item[f.name], f)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing(item)}
                    className="mr-2 rounded p-1.5 text-gray-500 hover:bg-gray-100"
                    aria-label="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing === "new" ? "Add" : "Edit"} {title}</h2>
              <button onClick={close} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form action={handleSubmit} className="mt-4 space-y-4">
              {fields.map((f) => (
                <div key={f.name}>
                  {f.type === "checkbox" ? (
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        name={f.name}
                        defaultChecked={editing !== "new" ? Boolean(editing[f.name]) : false}
                      />
                      {f.label}
                    </label>
                  ) : f.type === "toggle" ? (
                    <Toggle
                      name={f.name}
                      label={f.label}
                      initialChecked={editing !== "new" ? Boolean(editing[f.name]) : false}
                    />
                  ) : f.type === "media" ? (
                    <>
                      <label className="mb-1 block text-sm font-medium">{f.label}</label>
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
                      <label className="mb-1 block text-sm font-medium">{f.label}</label>
                      {f.type === "select" ? (
                        <select
                          name={f.name}
                          required={f.required}
                          defaultValue={editing !== "new" ? String(editing[f.name] ?? "") : (f.options?.[0] ?? "")}
                          className="w-full rounded-md border px-3 py-2"
                        >
                          {f.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {f.optionLabels?.[opt] ?? opt}
                            </option>
                          ))}
                        </select>
                      ) : f.type === "textarea" || f.type === "json" ? (
                        <textarea
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
                          className="w-full rounded-md border px-3 py-2 font-mono text-xs"
                        />
                      ) : (
                        <input
                          name={f.name}
                          type={f.type}
                          required={f.required}
                          defaultValue={editing !== "new" ? String(editing[f.name] ?? "") : ""}
                          className="w-full rounded-md border px-3 py-2"
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-primary px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving..." : "Save"}
              </button>
            </form>
          </div>
        </div>
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
      <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
        <UploadCloud size={16} />
        {uploading ? "Uploading..." : path ? "Replace" : "Upload"}
        <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
    </div>
  );
}
