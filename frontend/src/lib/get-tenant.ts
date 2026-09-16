import { cache } from "react";
import { headers } from "next/headers";
import { publicGet } from "@/lib/api";
import type { Tenant } from "@/lib/types";

/** The tenant slug set by middleware.ts from the resolved Host header. */
export async function getTenantSlug(): Promise<string> {
  const headerList = await headers();
  const slug = headerList.get("x-tenant-slug");
  if (!slug) {
    throw new Error("x-tenant-slug header missing — middleware should have set it for every page route");
  }
  return slug;
}

/** React `cache()` dedupes this to one backend call per request even though
 * layout.tsx and individual pages both need the tenant. */
export const getTenant = cache(async (): Promise<Tenant> => {
  const slug = await getTenantSlug();
  return publicGet<Tenant>(slug, "/public/theme");
});
