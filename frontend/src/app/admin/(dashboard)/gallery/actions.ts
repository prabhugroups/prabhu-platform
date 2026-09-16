"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

export async function createGallery(title: string, date: string | null) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "POST", "/admin/galleries", { title, date });
  revalidatePath("/admin/gallery");
}

export async function deleteGallery(galleryId: number) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "DELETE", `/admin/galleries/${galleryId}`);
  revalidatePath("/admin/gallery");
}

export async function addGalleryImage(galleryId: number, file: string, type: string) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "POST", `/admin/galleries/${galleryId}/images`, {
    file,
    type,
  });
  revalidatePath("/admin/gallery");
}

export async function deleteGalleryImage(galleryId: number, imageId: number) {
  const session = await requireTenantAdmin();
  await adminMutate({ token: session.token }, "DELETE", `/admin/galleries/${galleryId}/images/${imageId}`);
  revalidatePath("/admin/gallery");
}
