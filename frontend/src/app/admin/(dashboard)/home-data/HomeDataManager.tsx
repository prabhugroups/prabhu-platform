"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HomeContentData, Spokesperson } from "@/lib/types";
import type { ResourceRow } from "@/lib/admin/field-types";
import { ResourceManager, MediaField } from "@/components/admin/ResourceManager";
import { RichTextEditor } from "@/components/fields/RichTextEditor";
import { Toggle } from "@/components/ui/Toggle";
import { upsertHomeAbout, upsertSpokesperson } from "./actions";

const TABS = ["About Us", "Our Stake Holders", "Our Associates", "Spokesperson"] as const;
type Tab = (typeof TABS)[number];

/** Mirrors the legacy CRM's "Home Data" page (tabs: About Us / Our Stake
 * Holders / Our Associates / Spokesperson) — see backend
 * app/modules/home_content for the four resources this drives. */
export function HomeDataManager({
  about,
  spokesperson,
  stakeholders,
  associates,
}: {
  about: HomeContentData | null;
  spokesperson: Spokesperson | null;
  stakeholders: ResourceRow[];
  associates: ResourceRow[];
}) {
  const [tab, setTab] = useState<Tab>("About Us");

  return (
    <div>
      <h1 className="text-2xl font-bold">Add Homepage Data</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "active-button" : "inactive-button"}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "About Us" && <AboutTab about={about} />}
        {tab === "Our Stake Holders" && (
          <ResourceManager
            title="Our Stake Holders"
            basePath="/admin/home-content/stakeholders"
            fields={[
              { name: "logo_file", label: "Logo", type: "media", mediaModule: "stakeholders" },
              { name: "link", label: "Website Link", type: "url" },
              { name: "sort_order", label: "Sort Order", type: "number" },
            ]}
            items={stakeholders}
          />
        )}
        {tab === "Our Associates" && (
          <ResourceManager
            title="Our Associates"
            basePath="/admin/home-content/associates"
            fields={[
              { name: "logo_file", label: "Logo", type: "media", mediaModule: "associates" },
              { name: "link", label: "Website Link", type: "url" },
              { name: "sort_order", label: "Sort Order", type: "number" },
            ]}
            items={associates}
          />
        )}
        {tab === "Spokesperson" && <SpokespersonTab spokesperson={spokesperson} />}
      </div>
    </div>
  );
}

function AboutTab({ about }: { about: HomeContentData | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await upsertHomeAbout({
        about_content: (formData.get("about_content") as string) || null,
        highlighted_content: (formData.get("highlighted_content") as string) || null,
      });
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-3xl space-y-6">
      <RichTextEditor name="about_content" label="About Us Content" initialValue={about?.about_content ?? null} />
      <RichTextEditor
        name="highlighted_content"
        label="Highlighted Content"
        initialValue={about?.highlighted_content ?? null}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Updating..." : "Update"}
      </button>
    </form>
  );
}

function SpokespersonTab({ spokesperson }: { spokesperson: Spokesperson | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await upsertSpokesperson({
        name: (formData.get("name") as string) || null,
        role: (formData.get("role") as string) || null,
        phone: (formData.get("phone") as string) || null,
        email: (formData.get("email") as string) || null,
        image: (formData.get("image") as string) || null,
        show: formData.get("show") === "on",
      });
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Photo</label>
        <MediaField name="image" module="spokesperson" initialPath={spokesperson?.image ?? null} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input name="name" defaultValue={spokesperson?.name ?? ""} className="w-full rounded-md border px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Role</label>
        <input name="role" defaultValue={spokesperson?.role ?? ""} className="w-full rounded-md border px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Phone (WhatsApp)</label>
        <input name="phone" defaultValue={spokesperson?.phone ?? ""} className="w-full rounded-md border px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input name="email" defaultValue={spokesperson?.email ?? ""} className="w-full rounded-md border px-3 py-2" />
      </div>
      <Toggle name="show" label="Show on homepage" initialChecked={spokesperson?.show ?? false} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Updating..." : "Update"}
      </button>
    </form>
  );
}
