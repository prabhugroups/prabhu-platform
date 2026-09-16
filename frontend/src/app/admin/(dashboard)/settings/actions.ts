"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

export interface TenantBrandingInput {
  primary_color?: string;
  secondary_color?: string;
  primary_light_color?: string;
  font_family?: string;
  footer_text?: string;
  logo_file?: string;
  favicon_file?: string;
  default_og_image_file?: string;
}

export async function updateOwnTenantBranding(data: TenantBrandingInput) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PATCH", "/admin/tenant", data);
  revalidatePath("/admin/settings");
}

export interface TenantContactInput {
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  location: string | null;
  opening_hours: string | null;
  whatsapp_number: string | null;
  registered_office: string | null;
  branch_office: string | null;
  copyright_text: string | null;
  map_file: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
}

export async function updateContactInfo(data: TenantContactInput) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PUT", "/admin/contact-info", data);
  revalidatePath("/admin/settings");
}
