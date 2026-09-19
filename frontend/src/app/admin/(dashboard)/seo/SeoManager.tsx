"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PageSeo } from "@/lib/types";
import { SEO_PAGES } from "@/lib/seo-pages";
import { upsertPageSeo } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      toast.success("SEO settings saved.");
      router.refresh();
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">SEO Settings</h1>
      <Tabs value={selected} onValueChange={setSelected} className="mt-4">
        <TabsList className="h-auto flex-wrap">
          {SEO_PAGES.map((p) => (
            <TabsTrigger key={p.key} value={p.key}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <form action={handleSubmit} key={selected} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Meta Title</Label>
            <Input id="title" name="title" defaultValue={current?.title ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="keywords">Meta Keywords</Label>
            <Input
              id="keywords"
              name="keywords"
              placeholder="comma, separated, keywords"
              defaultValue={current?.keywords ?? ""}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Meta Description</Label>
          <Textarea id="description" name="description" rows={3} defaultValue={current?.description ?? ""} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? "Saving..." : "Save"}
        </Button>
      </form>
    </div>
  );
}
