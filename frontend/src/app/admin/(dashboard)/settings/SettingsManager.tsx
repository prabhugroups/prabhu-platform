"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tenant, TenantContact } from "@/lib/types";
import { MediaField } from "@/components/admin/ResourceManager";
import { updateContactInfo, updateOwnTenantBranding } from "./actions";

const TABS = ["Theme", "Setting", "Favicon"] as const;
type Tab = (typeof TABS)[number];

/** Mirrors the legacy CRM's Settings page (tabs: Theme / Setting / Favicon)
 * — Theme and Favicon edit the tenant's own branding (see backend
 * app/modules/tenants/router.py:admin_update_own_tenant), Setting edits
 * TenantContact (phones/email/social/hours/map). */
export function SettingsManager({ tenant, contact }: { tenant: Tenant; contact: TenantContact | null }) {
  const [tab, setTab] = useState<Tab>("Theme");

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "active-button" : "inactive-button"}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Theme" && <ThemeTab tenant={tenant} />}
        {tab === "Setting" && <SettingTab contact={contact} />}
        {tab === "Favicon" && <FaviconTab tenant={tenant} />}
      </div>
    </div>
  );
}

function ThemeTab({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateOwnTenantBranding({
        logo_file: (formData.get("logo_file") as string) || undefined,
        footer_text: (formData.get("footer_text") as string) || undefined,
        primary_color: String(formData.get("primary_color") ?? tenant.primary_color),
        primary_light_color: String(formData.get("primary_light_color") ?? tenant.primary_light_color),
        secondary_color: String(formData.get("secondary_color") ?? tenant.secondary_color),
      });
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Logo</label>
        <MediaField name="logo_file" module="branding" initialPath={tenant.logo_file} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Footer Text</label>
        <textarea
          name="footer_text"
          rows={3}
          defaultValue={tenant.footer_text ?? ""}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Primary Color</label>
          <input type="color" name="primary_color" defaultValue={tenant.primary_color} className="h-10 w-full rounded border" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Primary Light</label>
          <input
            type="color"
            name="primary_light_color"
            defaultValue={tenant.primary_light_color}
            className="h-10 w-full rounded border"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Secondary Color</label>
          <input type="color" name="secondary_color" defaultValue={tenant.secondary_color} className="h-10 w-full rounded border" />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

function FaviconTab({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateOwnTenantBranding({
        favicon_file: (formData.get("favicon_file") as string) || undefined,
        default_og_image_file: (formData.get("default_og_image_file") as string) || undefined,
      });
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-lg space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium">Favicon</label>
        <MediaField name="favicon_file" module="branding" initialPath={tenant.favicon_file} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Default Share Image (OG Image)</label>
        <MediaField name="default_og_image_file" module="branding" initialPath={tenant.default_og_image_file} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

function SettingTab({ contact }: { contact: TenantContact | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const get = (name: string) => (formData.get(name) as string) || null;
    startTransition(async () => {
      await updateContactInfo({
        phone_primary: get("phone_primary"),
        phone_secondary: get("phone_secondary"),
        email: get("email"),
        location: get("location"),
        opening_hours: get("opening_hours"),
        whatsapp_number: get("whatsapp_number"),
        registered_office: get("registered_office"),
        branch_office: get("branch_office"),
        copyright_text: get("copyright_text"),
        map_file: get("map_file"),
        facebook_url: get("facebook_url"),
        instagram_url: get("instagram_url"),
        youtube_url: get("youtube_url"),
      });
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone (Primary)" name="phone_primary" defaultValue={contact?.phone_primary} />
        <Field label="Phone (Secondary)" name="phone_secondary" defaultValue={contact?.phone_secondary} />
      </div>
      <Field label="Email" name="email" defaultValue={contact?.email} />
      <Field label="Location" name="location" defaultValue={contact?.location} />
      <Field label="Opening Hours" name="opening_hours" defaultValue={contact?.opening_hours} />
      <Field label="WhatsApp Number" name="whatsapp_number" defaultValue={contact?.whatsapp_number} />
      <Field label="Registered Office" name="registered_office" defaultValue={contact?.registered_office} />
      <Field label="Branch Office" name="branch_office" defaultValue={contact?.branch_office} />
      <Field label="Copyright Text" name="copyright_text" defaultValue={contact?.copyright_text} />
      <div>
        <label className="mb-1 block text-sm font-medium">Map Image</label>
        <MediaField name="map_file" module="settings" initialPath={contact?.map_file ?? null} />
      </div>
      <Field label="Facebook URL" name="facebook_url" defaultValue={contact?.facebook_url} />
      <Field label="Instagram URL" name="instagram_url" defaultValue={contact?.instagram_url} />
      <Field label="YouTube URL" name="youtube_url" defaultValue={contact?.youtube_url} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input name={name} defaultValue={defaultValue ?? ""} className="w-full rounded-md border px-3 py-2" />
    </div>
  );
}
