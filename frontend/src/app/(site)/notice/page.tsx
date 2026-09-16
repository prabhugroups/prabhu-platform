import type { Metadata } from "next";
import { getTenant } from "@/lib/get-tenant";
import { DocumentsList } from "@/components/DocumentsList";
import { NOTICE_CATEGORIES } from "@/lib/document-categories";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: "Notices", description: `Public notices from ${tenant.name}.` };
}

export default function NoticePage() {
  return <DocumentsList title="Notices" categories={[...NOTICE_CATEGORIES]} />;
}
