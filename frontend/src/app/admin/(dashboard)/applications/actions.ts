"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

export async function updateApplicationStatus(id: number, status: "pending" | "approved" | "rejected") {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "PATCH", `/admin/applications/${id}`, { status });
  revalidatePath("/admin/applications");
}

export async function deleteApplication(id: number) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "DELETE", `/admin/applications/${id}`);
  revalidatePath("/admin/applications");
}
