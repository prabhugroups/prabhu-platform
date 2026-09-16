import type { Metadata } from "next";
import Image from "next/image";
import { publicGet, mediaUrl } from "@/lib/api";
import { getTenant, getTenantSlug } from "@/lib/get-tenant";
import type { TeamMember } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: "About Us", description: `Learn about ${tenant.name}.` };
}

function memberName(m: TeamMember): string {
  const info = m.additional_info as { name?: string; title?: string } | null;
  return info?.name ?? "—";
}

function memberTitle(m: TeamMember): string {
  const info = m.additional_info as { name?: string; title?: string } | null;
  return info?.title ?? "";
}

export default async function AboutPage() {
  const tenant = await getTenant();
  const slug = await getTenantSlug();
  const team = await publicGet<TeamMember[]>(slug, "/teams");

  const directors = team.filter((m) => m.type === "director");
  const management = team.filter((m) => m.type !== "director");

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold">About {tenant.name}</h1>
      {tenant.footer_text && <p className="mt-4 max-w-2xl text-gray-600">{tenant.footer_text}</p>}

      {directors.length > 0 && <TeamSection title="Board of Directors" members={directors} />}
      {management.length > 0 && <TeamSection title="Management Team" members={management} />}
    </div>
  );
}

function TeamSection({ title, members }: { title: string; members: TeamMember[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {members
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((m) => {
            const img = mediaUrl(m.image);
            return (
              <div key={m.id} className="text-center">
                {img && (
                  <Image
                    src={img}
                    alt={memberName(m)}
                    width={128}
                    height={128}
                    className="mx-auto h-28 w-28 rounded-full object-cover"
                  />
                )}
                <p className="mt-3 font-medium">{memberName(m)}</p>
                <p className="text-sm text-gray-500">{memberTitle(m)}</p>
              </div>
            );
          })}
      </div>
    </section>
  );
}
