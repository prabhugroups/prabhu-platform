import type { Metadata } from "next";
import { getTenant } from "@/lib/get-tenant";
import { DocumentsList } from "@/components/DocumentsList";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: "Legal & Reports", description: `Annual reports and legal disclosures from ${tenant.name}.` };
}

export default function LegalPage() {
  return <DocumentsList title="Legal & Reports" type="legal" />;
}
