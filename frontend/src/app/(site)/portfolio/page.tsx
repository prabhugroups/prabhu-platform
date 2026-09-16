import type { Metadata } from "next";
import Image from "next/image";
import { publicGet, mediaUrl } from "@/lib/api";
import { getTenant, getTenantSlug } from "@/lib/get-tenant";
import type { Portfolio } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: "Portfolio", description: `Projects and assets of ${tenant.name}.` };
}

export default async function PortfolioPage() {
  const slug = await getTenantSlug();
  const portfolios = await publicGet<Portfolio[]>(slug, "/portfolios");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">Portfolio</h1>

      {portfolios.length === 0 && <p className="mt-6 text-gray-500">No portfolio items yet.</p>}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {portfolios.map((p) => {
          const img = mediaUrl(p.file);
          return (
            <div key={p.id} className="overflow-hidden rounded-lg border bg-white">
              {img && (
                <Image
                  src={img}
                  alt={p.title}
                  width={400}
                  height={250}
                  className="h-48 w-full object-cover"
                />
              )}
              <div className="p-4">
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-gray-500">{p.type}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
