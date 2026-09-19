"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { HomeContentData, Spokesperson } from "@/lib/types";
import type { ResourceRow } from "@/lib/admin/field-types";
import { ResourceManager, MediaField } from "@/components/admin/ResourceManager";
import { RichTextEditor } from "@/components/fields/RichTextEditor";
import { upsertHomeAbout, upsertSpokesperson } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mt-4">
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
      toast.success("Homepage content updated.");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <RichTextEditor name="about_content" label="About Us Content" initialValue={about?.about_content ?? null} />
      <RichTextEditor
        name="highlighted_content"
        label="Highlighted Content"
        initialValue={about?.highlighted_content ?? null}
      />
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Updating..." : "Update"}
      </Button>
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
      toast.success("Spokesperson updated.");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <Label className="mb-1.5">Photo</Label>
        <MediaField name="image" module="spokesperson" initialPath={spokesperson?.image ?? null} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={spokesperson?.name ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Input id="role" name="role" defaultValue={spokesperson?.role ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (WhatsApp)</Label>
          <Input id="phone" name="phone" defaultValue={spokesperson?.phone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" defaultValue={spokesperson?.email ?? ""} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="show" name="show" value="on" defaultChecked={spokesperson?.show ?? false} />
        <Label htmlFor="show">Show on homepage</Label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Updating..." : "Update"}
      </Button>
    </form>
  );
}
