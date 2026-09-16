"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteSetting, upsertSetting, type SettingInput } from "./actions";
import { uploadMedia } from "@/lib/admin/generic-actions";
import { mediaUrl } from "@/lib/media-url-client";
import type { ContentSetting } from "@/lib/types";

/** content_settings is the flexible group/key/value/file table that drives
 * hero banners, about-us copy, and per-page SEO records (see backend
 * app/modules/settings). Suggested keys are just a starting point — any
 * group/key pair works, matching the legacy CMS's free-form usage. */
const SUGGESTED_KEYS = [
  { group: "home", key: "homeHero", hint: "Homepage hero title/subtitle + banner image" },
  { group: "home", key: "homeIntro", hint: "Homepage 'About' blurb" },
  { group: "seo", key: "homeSeo", hint: "Homepage SEO title/description" },
  { group: "seo", key: "aboutSeo", hint: "About page SEO title/description" },
  { group: "seo", key: "contactSeo", hint: "Contact page SEO title/description" },
];

export function SettingsManager({ items }: { items: ContentSetting[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ContentSetting | Partial<ContentSetting> | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  function close() {
    setEditing(null);
  }

  function handleSubmit(formData: FormData) {
    const data: SettingInput = {
      group: String(formData.get("group") ?? ""),
      key: String(formData.get("key") ?? ""),
      type: String(formData.get("type") ?? "text"),
      value: (formData.get("value") as string) || null,
      title: (formData.get("title") as string) || null,
      file: (formData.get("file") as string) || null,
    };
    startTransition(async () => {
      await upsertSetting(data);
      close();
      router.refresh();
    });
  }

  function handleDelete(key: string) {
    if (!confirm(`Delete setting "${key}"?`)) return;
    startTransition(async () => {
      await deleteSetting(key);
      router.refresh();
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const path = await uploadMedia("settings", fd);
      setEditing({ ...editing, file: path });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content &amp; SEO</h1>
        <button
          onClick={() => setEditing({ group: "", key: "", type: "text", value: "", title: "", file: null })}
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add Content Block
        </button>
      </div>

      {items.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">
          No content blocks yet. Try adding one of:{" "}
          {SUGGESTED_KEYS.map((s) => s.key).join(", ")}.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between rounded-lg border bg-white p-4">
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">
                {item.group} / {item.key}
              </p>
              {item.title && <p className="font-medium">{item.title}</p>}
              {item.value && <p className="mt-1 max-w-xl truncate text-sm text-gray-600">{item.value}</p>}
              {item.file && <p className="mt-1 text-xs text-gray-400">{item.file}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(item)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(item.key)}
                className="rounded p-1.5 text-red-500 hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Content Block</h2>
              <button onClick={close} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form action={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Group</label>
                  <input
                    name="group"
                    required
                    defaultValue={editing.group ?? ""}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Key</label>
                  <input
                    name="key"
                    required
                    readOnly={"id" in editing && Boolean(editing.id)}
                    defaultValue={editing.key ?? ""}
                    className="w-full rounded-md border px-3 py-2 read-only:bg-gray-100"
                  />
                </div>
              </div>
              <input type="hidden" name="type" value="text" />
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <input
                  name="title"
                  defaultValue={editing.title ?? ""}
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Value / Description</label>
                <textarea
                  name="value"
                  rows={4}
                  defaultValue={editing.value ?? ""}
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Image</label>
                <div className="flex items-center gap-3">
                  <input type="hidden" name="file" value={editing.file ?? ""} readOnly />
                  {mediaUrl(editing.file ?? null) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(editing.file ?? null)!} alt="" className="h-12 w-12 rounded object-cover" />
                  )}
                  <label className="cursor-pointer rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    {uploading ? "Uploading..." : "Upload"}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
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
