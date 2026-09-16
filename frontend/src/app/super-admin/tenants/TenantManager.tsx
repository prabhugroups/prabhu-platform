"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import {
  addTenantDomain,
  createTenant,
  removeTenantDomain,
  updateTenant,
  uploadTenantMedia,
} from "../actions";
import { mediaUrl } from "@/lib/media-url-client";

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
  const [expanded, setExpanded] = useState<number | null>(null);

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
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> New Tenant
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="rounded-lg border bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setExpanded(expanded === tenant.id ? null : tenant.id)}
                className="text-left"
              >
                <p className="font-medium">{tenant.name}</p>
                <p className="text-xs text-gray-400">{tenant.slug}</p>
              </button>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={tenant.is_active}
                    disabled={pending}
                    onChange={() => toggleFlag(tenant, "is_active")}
                  />
                  Active
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={tenant.shareholder_module_enabled}
                    disabled={pending}
                    onChange={() => toggleFlag(tenant, "shareholder_module_enabled")}
                  />
                  Shareholder Module
                </label>
              </div>
            </div>

            {expanded === tenant.id && (
              <div className="border-t p-4">
                <p className="mb-2 text-sm font-medium text-gray-600">Domains</p>
                <ul className="space-y-1">
                  {tenant.domains.map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-sm">
                      <span>
                        {d.hostname} {d.is_primary && <span className="text-xs text-gray-400">(primary)</span>}
                      </span>
                      <button
                        onClick={() => handleRemoveDomain(tenant.id, d.id)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  action={(fd) => handleAddDomain(tenant.id, fd)}
                  className="mt-3 flex gap-2"
                >
                  <input
                    name="hostname"
                    placeholder="new-domain.com"
                    className="flex-1 rounded-md border px-3 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Add Domain
                  </button>
                </form>

                <BrandingForm tenant={tenant} pending={pending} onSaved={() => router.refresh()} />
              </div>
            )}
          </div>
        ))}
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">New Tenant</h2>
              <button onClick={() => setCreating(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form action={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Slug</label>
                <input name="slug" required className="w-full rounded-md border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input name="name" required className="w-full rounded-md border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Primary Domain</label>
                <input name="hostname" placeholder="example.com" className="w-full rounded-md border px-3 py-2" />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-primary px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Creating..." : "Create Tenant"}
              </button>
            </form>
          </div>
        </div>
      )}
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
      <p className="mb-2 text-sm font-medium text-gray-600">Branding</p>
      <form action={handleSave} className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-2 text-sm">
          Primary color
          <input
            type="color"
            name="primary_color"
            defaultValue={tenant.primary_color}
            className="h-8 w-14 rounded border"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          Secondary color
          <input
            type="color"
            name="secondary_color"
            defaultValue={tenant.secondary_color}
            className="h-8 w-14 rounded border"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          Primary light color
          <input
            type="color"
            name="primary_light_color"
            defaultValue={tenant.primary_light_color}
            className="h-8 w-14 rounded border"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          Font family
          <input
            name="font_family"
            defaultValue={tenant.font_family}
            placeholder="Sansation"
            className="w-40 rounded-md border px-2 py-1 text-sm"
          />
        </label>
        <label className="sm:col-span-2 text-sm">
          Footer text
          <textarea
            name="footer_text"
            defaultValue={tenant.footer_text ?? ""}
            rows={2}
            className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="sm:col-span-2 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Save Branding
        </button>
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
              <p className="mb-1 text-gray-600">{label}</p>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={label} className="mb-2 h-12 w-auto rounded border object-contain" />
              ) : (
                <p className="mb-2 text-xs text-gray-400">Not set</p>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={pending || uploading === field}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(field, file);
                }}
                className="text-xs"
              />
              {uploading === field && <p className="text-xs text-gray-400">Uploading...</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
