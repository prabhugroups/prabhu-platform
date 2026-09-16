import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTenant } from "@/lib/get-tenant";
import { ApplyForm } from "../apply/ApplyForm";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: "Request Shares", description: `Request to purchase shares in ${tenant.name}.` };
}

export default async function RequestSharePage() {
  const tenant = await getTenant();
  if (tenant.shareholder_module_enabled) {
    redirect("/apply-membership");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-center text-3xl font-bold">Request Shares</h1>
      <p className="mt-2 text-center text-gray-600">Submit your details to request shares in {tenant.name}.</p>
      <div className="mt-10">
        <ApplyForm variant="simple" />
      </div>
    </div>
  );
}
