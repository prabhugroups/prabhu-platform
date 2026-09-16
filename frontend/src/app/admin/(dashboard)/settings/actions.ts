"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

export interface SettingInput {
  group: string;
  key: string;
  type: string;
  value: string | null;
  title: string | null;
  file: string | null;
}

export async function upsertSetting(data: SettingInput) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PUT", "/admin/settings", data);
  revalidatePath("/admin/settings");
}

export async function deleteSetting(key: string) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "DELETE", `/admin/settings/${encodeURIComponent(key)}`);
  revalidatePath("/admin/settings");
}
