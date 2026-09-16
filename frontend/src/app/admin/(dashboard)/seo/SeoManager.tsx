"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PageSeo } from "@/lib/types";
import { SEO_PAGES } from "@/lib/seo-pages";
import { upsertPageSeo } from "./actions";

/** Mirrors the legacy CRM's SEO Settings page: a page-picker pill list,
 * each page's title/description/keywords upserted by page_key (see backend
 * app/modules/page_seo). */
export function SeoManager({ pages }: { pages: PageSeo[] }) {
  const [selected, setSelected] = useState<string>(SEO_PAGES[0].key);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const current = pages.find((p) => p.page_key === selected) ?? null;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await upsertPageSeo({
        page_key: selected,
        title: (formData.get("title") as string) || null,
        description: (formData.get("description") as string) || null,
        keywords: (formData.get("keywords") as string) || null,
      });
      router.refresh();
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">SEO Settings</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {SEO_PAGES.map((p) => (
          <button
            key={p.key}
            onClick={() => setSelected(p.key)}
            className={selected === p.key ? "active-button" : "inactive-button"}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form action={handleSubmit} key={selected} className="mt-6 max-w-2xl space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Meta Title</label>
          <input name="title" defaultValue={current?.title ?? ""} className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Meta Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={current?.description ?? ""}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Meta Keywords</label>
          <input
            name="keywords"
            placeholder="comma, separated, keywords"
            defaultValue={current?.keywords ?? ""}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-6 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
