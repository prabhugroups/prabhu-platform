import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { Gallery } from "@/lib/types";
import { GalleryManager } from "./GalleryManager";

export default async function GalleryAdminPage() {
  const session = await requireTenantAdmin();
  const galleries = await adminGet<Gallery[]>({ token: session.token }, "/admin/galleries");
  return <GalleryManager galleries={galleries} />;
}
