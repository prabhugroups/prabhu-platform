import type { Metadata } from "next";
import { getTenant } from "@/lib/get-tenant";
import { ContactForm } from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: `Contact Us`, description: `Get in touch with ${tenant.name}.` };
}

export default async function ContactPage() {
  const tenant = await getTenant();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-center text-3xl font-bold">Contact {tenant.name}</h1>
      <p className="mt-2 text-center text-gray-600">We&apos;d love to hear from you.</p>
      <div className="mt-10">
        <ContactForm />
      </div>
    </div>
  );
}
