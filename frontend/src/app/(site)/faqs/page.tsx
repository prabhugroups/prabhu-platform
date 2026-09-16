import type { Metadata } from "next";
import { publicGet } from "@/lib/api";
import { getTenant, getTenantSlug } from "@/lib/get-tenant";
import type { Faq } from "@/lib/types";
import { FaqAccordion } from "./FaqAccordion";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: "FAQs", description: `Frequently asked questions about ${tenant.name}.` };
}

export default async function FaqsPage() {
  const slug = await getTenantSlug();
  const faqs = await publicGet<Faq[]>(slug, "/faqs");

  const categories = Array.from(new Set(faqs.map((f) => f.category ?? "General")));

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>

      {faqs.length === 0 && <p className="mt-6 text-gray-500">No FAQs published yet.</p>}

      {categories.map((category) => {
        const items = faqs
          .filter((f) => (f.category ?? "General") === category)
          .sort((a, b) => a.sort_order - b.sort_order);
        return (
          <section key={category} className="mt-10">
            <h2 className="mb-3 text-lg font-semibold">{category}</h2>
            <FaqAccordion faqs={items} />
          </section>
        );
      })}
    </div>
  );
}
