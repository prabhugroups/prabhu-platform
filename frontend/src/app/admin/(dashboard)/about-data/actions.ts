"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { AboutSection } from "@/lib/types";

export interface AboutPageInput {
  section: AboutSection;
  description: string | null;
  highlighted_content: string | null;
  bullet_point_content: string | null;
  file: string | null;
}

export async function upsertAboutPage(data: AboutPageInput) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PUT", "/admin/about-pages", data);
  revalidatePath("/admin/about-data");
}
