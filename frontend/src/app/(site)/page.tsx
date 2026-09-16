import Link from "next/link";
import Image from "next/image";
import { publicGet, mediaUrl } from "@/lib/api";
import { getTenant, getTenantSlug } from "@/lib/get-tenant";
import type { ContentSetting, Popup, Portfolio } from "@/lib/types";
import { PopupModal } from "@/components/PopupModal";

async function getSetting(slug: string, key: string): Promise<ContentSetting | null> {
  try {
    return await publicGet<ContentSetting>(slug, `/public/settings/${key}`);
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const tenant = await getTenant();
  const slug = await getTenantSlug();

  const [hero, intro, popups, portfolios] = await Promise.all([
    getSetting(slug, "homeHero"),
    getSetting(slug, "homeIntro"),
    publicGet<Popup[]>(slug, "/popups"),
    publicGet<Portfolio[]>(slug, "/portfolios"),
  ]);

  const activePopup = popups.find((p) => p.status);
  const popupImage = activePopup ? mediaUrl(activePopup.image) : null;
  const heroImage = mediaUrl(hero?.file);

  return (
    <div>
      {popupImage && <PopupModal imageUrl={popupImage} />}

      <section className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-primary text-white">
        {heroImage && (
          <Image src={heroImage} alt={tenant.name} fill priority className="object-cover opacity-30" />
        )}
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">{hero?.title ?? tenant.name}</h1>
          {hero?.value && <p className="mt-4 text-lg text-white/90">{hero.value}</p>}
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/contact"
              className="rounded-md bg-white px-6 py-3 font-medium text-primary hover:bg-white/90"
            >
              Contact Us
            </Link>
            {tenant.shareholder_module_enabled ? (
              <Link
                href="/apply-membership"
                className="rounded-md border border-white px-6 py-3 font-medium hover:bg-white/10"
              >
                Apply for Membership
              </Link>
            ) : (
              <Link
                href="/request-share"
                className="rounded-md border border-white px-6 py-3 font-medium hover:bg-white/10"
              >
                Request Shares
              </Link>
            )}
          </div>
        </div>
      </section>

      {intro?.value && (
        <section className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold">About {tenant.name}</h2>
          <p className="mt-4 whitespace-pre-line text-gray-600">{intro.value}</p>
        </section>
      )}

      {portfolios.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold">Our Portfolio</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {portfolios.slice(0, 6).map((p) => {
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
            <div className="mt-8 text-center">
              <Link href="/portfolio" className="font-medium text-primary hover:underline">
                View all portfolio &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
