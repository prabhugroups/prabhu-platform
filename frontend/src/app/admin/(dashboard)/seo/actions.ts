"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

export interface PageSeoInput {
  page_key: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
}

export async function upsertPageSeo(data: PageSeoInput) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PUT", "/admin/page-seo", data);
  revalidatePath("/admin/seo");
}
