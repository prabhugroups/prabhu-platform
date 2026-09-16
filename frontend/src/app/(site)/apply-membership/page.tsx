import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTenant } from "@/lib/get-tenant";
import { ApplyForm } from "../apply/ApplyForm";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: "Apply for Membership", description: `Apply for shareholder membership at ${tenant.name}.` };
}

export default async function ApplyMembershipPage() {
  const tenant = await getTenant();
  if (!tenant.shareholder_module_enabled) {
    redirect("/request-share");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-center text-3xl font-bold">Apply for Membership</h1>
      <p className="mt-2 text-center text-gray-600">
        Submit your details to apply for shareholder membership at {tenant.name}.
      </p>
      <div className="mt-10">
        <ApplyForm variant="full" />
      </div>
    </div>
  );
}
