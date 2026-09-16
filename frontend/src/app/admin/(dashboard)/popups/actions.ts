"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

export async function createPopup(image: string) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "POST", "/admin/popups", { image, status: false });
  revalidatePath("/admin/popups");
}

export async function deletePopup(id: number) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "DELETE", `/admin/popups/${id}`);
  revalidatePath("/admin/popups");
}

export async function activatePopup(id: number) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PATCH", `/admin/popups/${id}/activate`);
  revalidatePath("/admin/popups");
}
