import Image from "next/image";
import Link from "next/link";
import { publicGet, mediaUrl } from "@/lib/api";
import { getTenant, getTenantSlug } from "@/lib/get-tenant";
import type { Banner as BannerData, HomeContentBundle, Popup, TenantContact } from "@/lib/types";
import { PopupModal } from "@/components/PopupModal";
import { Banner, type BannerSlide } from "@/components/Banner";
import { CtaButton } from "@/components/CtaButton";

/** Ported from prabhucablecar-web's (pages)/page.tsx: Banner carousel ->
 * "Who are we?" (rich text + optional Spokesperson card) -> Stakeholders
 * scroll row -> Request-Share CTA -> Associates scroll row -> optional map
 * image. Sections with no admin-entered data simply render nothing, since a
 * freshly-provisioned tenant starts empty. */
export default async function HomePage() {
  const tenant = await getTenant();
  const slug = await getTenantSlug();

  const [banners, home, contact, popups] = await Promise.all([
    publicGet<BannerData[]>(slug, "/banners"),
    publicGet<HomeContentBundle>(slug, "/home-content"),
    publicGet<TenantContact | null>(slug, "/contact-info"),
    publicGet<Popup[]>(slug, "/popups"),
  ]);

  const slides: BannerSlide[] = banners
    .map((b) => {
      const imageUrl = mediaUrl(b.file);
      return imageUrl ? { title: b.title, link: b.link, imageUrl } : null;
    })
    .filter((s): s is BannerSlide => s !== null);

  const activePopup = popups.find((p) => p.status);
  const popupImage = activePopup ? mediaUrl(activePopup.image) : null;

  const spokesperson = home.spokesperson;
  const mapImage = mediaUrl(contact?.map_file);

  return (
    <>
      {popupImage && <PopupModal imageUrl={popupImage} />}

      <Banner slides={slides} />

      <div className="custom-container mt-4 flex flex-col gap-4 md:gap-20">
        {/* Who are we? */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-12 max-md:flex-col">
            {home.about?.about_content && (
              <div
                dangerouslySetInnerHTML={{ __html: home.about.about_content }}
                className="space-y-4"
              />
            )}
            {spokesperson?.show && (
              <div className="mx-auto">
                <div className="flex gap-8 max-md:justify-around">
                  <div className="my-4 flex w-64 flex-col items-center justify-center gap-4 rounded-lg bg-light-blue px-4 py-12">
                    {spokesperson.image && (
                      <div className="relative h-[120px] w-[120px]">
                        <Image
                          src={mediaUrl(spokesperson.image) as string}
                          alt="spokesperson"
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-1 text-center">
                      <h3 className="whitespace-nowrap">{spokesperson.name}</h3>
                      <p>{spokesperson.role}</p>
                      {spokesperson.phone && (
                        <a
                          href={`https://wa.me/${spokesperson.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex cursor-pointer items-center gap-1 text-green-600 transition-colors hover:text-green-700"
                        >
                          {spokesperson.phone}
                        </a>
                      )}
                      {spokesperson.email && (
                        <a
                          href={`mailto:${spokesperson.email}`}
                          className="cursor-pointer text-blue-600 transition-colors hover:text-blue-700"
                        >
                          {spokesperson.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {home.about?.highlighted_content && (
            <div
              className="highlighted-content space-y-4 rounded-lg bg-light-green px-4 py-6"
              dangerouslySetInnerHTML={{ __html: home.about.highlighted_content }}
            />
          )}

          <Link href="/about">
            <CtaButton>Learn More</CtaButton>
          </Link>
        </section>

        {/* Our Major Stake Holders */}
        {home.stakeholders.length > 0 && (
          <section className="rounded-lg bg-green-50 py-4 lg:py-8">
            <div className="flex flex-col items-center gap-4 px-4 py-8 md:gap-8 md:px-16">
              <h2 className="text-2xl font-bold text-green-600">Our Major Stake Holders</h2>
              <div className="hide-scrollbar w-full">
                <div className="flex min-w-max justify-center gap-8 py-8">
                  {home.stakeholders.map((item) => {
                    const logo = mediaUrl(item.logo_file);
                    return (
                      <div key={item.id} className="relative flex-shrink-0">
                        <div className="mx-auto flex max-w-80 items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
                          {logo && (
                            <div className="relative h-[50px] w-[120px] md:h-[100px] md:w-[250px]">
                              <Image src={logo} alt="logo" fill className="object-contain" />
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-8 left-4">
                          {item.link ? (
                            <Link href={item.link} target="_blank" rel="noopener noreferrer">
                              <CtaButton>Visit Website</CtaButton>
                            </Link>
                          ) : (
                            <CtaButton>Coming Soon</CtaButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Request of Share Apply */}
        {tenant.shareholder_module_enabled && (
          <section className="rounded-lg bg-light-blue py-4">
            <div className="flex flex-col items-center gap-4 px-4 py-8 md:px-16">
              <h1>Request of Share Apply</h1>
              <p className="text-center">
                Download the Share Form and Fill It Properly &amp; Upload with Name and Mobile
                Number to Us Request of share Invest Application
              </p>
              <Link href="/request-share">
                <CtaButton>Apply Now</CtaButton>
              </Link>
            </div>
          </section>
        )}

        {/* Our Major Associates */}
        {home.associates.length > 0 && (
          <section className="rounded-lg bg-green-50 py-4 lg:py-8">
            <div className="flex flex-col items-center gap-4 px-4 py-8 md:gap-8 md:px-16">
              <h2 className="text-2xl font-bold text-green-600">Our Major Associates</h2>
              <div className="hide-scrollbar w-full">
                <div className="flex min-w-max justify-center gap-8 py-8">
                  {home.associates.map((item) => {
                    const logo = mediaUrl(item.logo_file);
                    return (
                      <div key={item.id} className="relative flex-shrink-0">
                        <div className="mx-auto flex max-w-80 items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
                          {logo && (
                            <div className="relative h-[50px] w-[120px] md:h-[100px] md:w-[250px]">
                              <Image src={logo} alt="logo" fill className="object-contain" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Map */}
        {mapImage && (
          <section>
            <div className="relative h-50 w-auto md:h-200">
              <Image src={mapImage} alt="contact-us" fill className="object-contain" />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
