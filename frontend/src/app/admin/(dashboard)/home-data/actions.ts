"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

export interface HomeAboutInput {
  about_content: string | null;
  highlighted_content: string | null;
}

export async function upsertHomeAbout(data: HomeAboutInput) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PUT", "/admin/home-content/about", data);
  revalidatePath("/admin/home-data");
}

export interface SpokespersonInput {
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  image: string | null;
  show: boolean;
}

export async function upsertSpokesperson(data: SpokespersonInput) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PUT", "/admin/home-content/spokesperson", data);
  revalidatePath("/admin/home-data");
}
