"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AboutPageData, AboutSection } from "@/lib/types";
import { RichTextEditor } from "@/components/fields/RichTextEditor";
import { MediaField } from "@/components/admin/ResourceManager";
import { upsertAboutPage } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      toast.success("About page updated.");
      router.refresh();
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">About Us Data</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as AboutSection)} className="mt-4">
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <form action={handleSubmit} key={tab} className="mt-6 space-y-6">
        <div>
          <Label className="mb-1.5">Image</Label>
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

        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? "Updating..." : "Update"}
        </Button>
      </form>
    </div>
  );
}
