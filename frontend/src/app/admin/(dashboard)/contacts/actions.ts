"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

export async function deleteContact(id: number) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "DELETE", `/admin/contacts/${id}`);
  revalidatePath("/admin/contacts");
}
