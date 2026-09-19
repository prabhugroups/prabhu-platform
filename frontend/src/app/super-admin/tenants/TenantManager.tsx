"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addTenantDomain,
  createTenant,
  removeTenantDomain,
  updateTenant,
  uploadTenantMedia,
} from "../actions";
import { mediaUrl } from "@/lib/media-url-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface TenantDomain {
  id: number;
  hostname: string;
  is_primary: boolean;
}

interface Tenant {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
  shareholder_module_enabled: boolean;
  primary_color: string;
  secondary_color: string;
  primary_light_color: string;
  font_family: string;
  footer_text: string | null;
  logo_file: string | null;
  favicon_file: string | null;
  default_og_image_file: string | null;
  domains: TenantDomain[];
}

export function TenantManager({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);

  function handleCreate(formData: FormData) {
    const slug = String(formData.get("slug") ?? "");
    const name = String(formData.get("name") ?? "");
    const hostname = String(formData.get("hostname") ?? "");
    startTransition(async () => {
      await createTenant({
        slug,
        name,
        shareholder_module_enabled: false,
        domains: hostname ? [{ hostname, is_primary: true }] : [],
      });
      toast.success("Tenant created.");
      setCreating(false);
      router.refresh();
    });
  }

  function toggleFlag(tenant: Tenant, field: "is_active" | "shareholder_module_enabled") {
    startTransition(async () => {
      await updateTenant(tenant.id, { [field]: !tenant[field] });
      router.refresh();
    });
  }

  function handleAddDomain(tenantId: number, formData: FormData) {
    const hostname = String(formData.get("hostname") ?? "");
    if (!hostname) return;
    startTransition(async () => {
      await addTenantDomain(tenantId, hostname, false);
      router.refresh();
    });
  }

  function handleRemoveDomain(tenantId: number, domainId: number) {
    startTransition(async () => {
      await removeTenantDomain(tenantId, domainId);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New Tenant
        </Button>
      </div>

      <Accordion type="single" collapsible className="mt-6 rounded-lg border">
        {tenants.map((tenant) => (
          <AccordionItem key={tenant.id} value={String(tenant.id)} className="px-4 last:border-b-0">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <AccordionTrigger className="w-full">
                  <div className="text-left">
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  </div>
                </AccordionTrigger>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={tenant.is_active}
                    disabled={pending}
                    onCheckedChange={() => toggleFlag(tenant, "is_active")}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={tenant.shareholder_module_enabled}
                    disabled={pending}
                    onCheckedChange={() => toggleFlag(tenant, "shareholder_module_enabled")}
                  />
                  Shareholder Module
                </label>
              </div>
            </div>

            <AccordionContent>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Domains</p>
              <ul className="space-y-1">
                {tenant.domains.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <span>
                      {d.hostname} {d.is_primary && <span className="text-xs text-muted-foreground">(primary)</span>}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveDomain(tenant.id, d.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
              <form action={(fd) => handleAddDomain(tenant.id, fd)} className="mt-3 flex gap-2">
                <Input name="hostname" placeholder="new-domain.com" className="flex-1" />
                <Button type="submit" variant="outline" disabled={pending}>
                  Add Domain
                </Button>
              </form>

              <BrandingForm tenant={tenant} pending={pending} onSaved={() => router.refresh()} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Tenant</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hostname">Primary Domain</Label>
              <Input id="hostname" name="hostname" placeholder="example.com" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending && <Loader2 className="animate-spin" />}
                {pending ? "Creating..." : "Create Tenant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrandingForm({
  tenant,
  pending,
  onSaved,
}: {
  tenant: Tenant;
  pending: boolean;
  onSaved: () => void;
}) {
  const [, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateTenant(tenant.id, {
        primary_color: String(formData.get("primary_color") ?? tenant.primary_color),
        secondary_color: String(formData.get("secondary_color") ?? tenant.secondary_color),
        primary_light_color: String(formData.get("primary_light_color") ?? tenant.primary_light_color),
        font_family: String(formData.get("font_family") ?? ""),
        footer_text: String(formData.get("footer_text") ?? ""),
      });
      toast.success("Branding saved.");
      onSaved();
    });
  }

  function handleFileUpload(field: "logo_file" | "favicon_file" | "default_og_image_file", file: File) {
    setUploading(field);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const path = await uploadTenantMedia(tenant.id, formData);
        await updateTenant(tenant.id, { [field]: path });
        onSaved();
      } finally {
        setUploading(null);
      }
    });
  }

  return (
    <div className="mt-4 border-t pt-4">
      <p className="mb-2 text-sm font-medium text-muted-foreground">Branding</p>
      <form action={handleSave} className="grid gap-3 sm:grid-cols-2">
        <Label className="flex items-center justify-between gap-2 font-normal">
          Primary color
          <input
            type="color"
            name="primary_color"
            defaultValue={tenant.primary_color}
            className="h-8 w-14 rounded border border-input"
          />
        </Label>
        <Label className="flex items-center justify-between gap-2 font-normal">
          Secondary color
          <input
            type="color"
            name="secondary_color"
            defaultValue={tenant.secondary_color}
            className="h-8 w-14 rounded border border-input"
          />
        </Label>
        <Label className="flex items-center justify-between gap-2 font-normal">
          Primary light color
          <input
            type="color"
            name="primary_light_color"
            defaultValue={tenant.primary_light_color}
            className="h-8 w-14 rounded border border-input"
          />
        </Label>
        <Label className="flex items-center justify-between gap-2 font-normal">
          Font family
          <Input name="font_family" defaultValue={tenant.font_family} placeholder="Sansation" className="w-40" />
        </Label>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`footer_text_${tenant.id}`}>Footer text</Label>
          <Textarea id={`footer_text_${tenant.id}`} name="footer_text" defaultValue={tenant.footer_text ?? ""} rows={2} />
        </div>
        <Button type="submit" variant="outline" disabled={pending} className="sm:col-span-2">
          Save Branding
        </Button>
      </form>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {(
          [
            ["logo_file", "Logo"],
            ["favicon_file", "Favicon"],
            ["default_og_image_file", "OG Image"],
          ] as const
        ).map(([field, label]) => {
          const current = tenant[field];
          const url = mediaUrl(current);
          return (
            <div key={field} className="text-sm">
              <p className="mb-1 text-muted-foreground">{label}</p>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={label} className="mb-2 h-12 w-auto rounded border object-contain" />
              ) : (
                <p className="mb-2 text-xs text-muted-foreground">Not set</p>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={pending || uploading === field}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(field, file);
                }}
                className="text-xs text-muted-foreground"
              />
              {uploading === field && <p className="text-xs text-muted-foreground">Uploading...</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
