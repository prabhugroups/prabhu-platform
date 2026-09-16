import type { Metadata } from "next";
import { getTenant } from "@/lib/get-tenant";
import { DocumentsList } from "@/components/DocumentsList";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: "Notices", description: `Public notices from ${tenant.name}.` };
}

export default function NoticePage() {
  return <DocumentsList title="Notices" type="notice" />;
}
