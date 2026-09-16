"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AboutPageData, AboutSection } from "@/lib/types";
import { RichTextEditor } from "@/components/fields/RichTextEditor";
import { MediaField } from "@/components/admin/ResourceManager";
import { upsertAboutPage } from "./actions";

const TABS: { key: AboutSection; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "strategic_objectives", label: "Strategic Objectives" },
  { key: "corporate_governance", label: "Corporate Governance" },
];

/** Mirrors the legacy CRM's "About Us Data" page (tabs: Overview / Strategic
 * Objectives / Corporate Governance) — see backend app/modules/about_page. */
export function AboutDataManager({ pages }: { pages: AboutPageData[] }) {
  const [tab, setTab] = useState<AboutSection>("overview");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const current = pages.find((p) => p.section === tab) ?? null;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await upsertAboutPage({
        section: tab,
        description: (formData.get("description") as string) || null,
        highlighted_content: (formData.get("highlighted_content") as string) || null,
        bullet_point_content: (formData.get("bullet_point_content") as string) || null,
        file: (formData.get("file") as string) || null,
      });
      router.refresh();
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">About Us Data</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? "active-button" : "inactive-button"}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form action={handleSubmit} key={tab} className="mt-6 max-w-3xl space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Image</label>
          <MediaField name="file" module="about" initialPath={current?.file ?? null} />
        </div>

        <RichTextEditor name="description" label="Description" initialValue={current?.description ?? null} />

        {tab === "overview" && (
          <>
            <RichTextEditor
              name="highlighted_content"
              label="Highlighted Content"
              initialValue={current?.highlighted_content ?? null}
            />
            <RichTextEditor
              name="bullet_point_content"
              label="Bullet Point Content"
              initialValue={current?.bullet_point_content ?? null}
            />
          </>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-6 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Updating..." : "Update"}
        </button>
      </form>
    </div>
  );
}
