"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

/** Generic mutate actions shared by every "simple" tenant-scoped CMS
 * resource (teams, documents, portfolios, popups, nav-items, faqs — the 11
 * byte-identical tables the pre-migration audit found across all 7 legacy
 * tenants). basePath is the admin collection path, e.g. "/admin/teams". */

export async function createResource(basePath: string, revalidate: string, data: Record<string, unknown>) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "POST", basePath, data);
  revalidatePath(revalidate);
}

export async function updateResource(
  basePath: string,
  id: number,
  revalidate: string,
  data: Record<string, unknown>,
) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PATCH", `${basePath}/${id}`, data);
  revalidatePath(revalidate);
}

export async function deleteResource(basePath: string, id: number, revalidate: string) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "DELETE", `${basePath}/${id}`);
  revalidatePath(revalidate);
}

const BASE_URL = process.env.INTERNAL_API_URL;

/** Raw multipart upload — separate from adminMutate because that always
 * JSON-encodes its body. Returns the relative path to store on the owning
 * row (e.g. teams.image, documents.file); see backend
 * app/modules/media/service.py for how it's validated and stored. */
export async function uploadMedia(module: string, formData: FormData): Promise<string> {
  const session = await requireTenantAdmin();
  const res = await fetch(`${BASE_URL}/admin/media/upload?module=${encodeURIComponent(module)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${await res.text()}`);
  }
  const data = (await res.json()) as { path: string };
  return data.path;
}
