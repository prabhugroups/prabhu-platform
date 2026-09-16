import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { publicGet, mediaUrl } from "@/lib/api";
import { getTenantSlug } from "@/lib/get-tenant";
import type { Faq, Tenant, TenantContact } from "@/lib/types";
import { buildSiteNav } from "@/lib/site-nav";

/** Ported from prabhucablecar-web's Footer.tsx: 3 columns (logo/hours/
 * phone/mail, Useful Links, Office Information + social icons) over a
 * light-blue background, plus a copyright line. */
export async function Footer({ tenant }: { tenant: Tenant }) {
  const slug = await getTenantSlug();
  const [contact, faqs] = await Promise.all([
    publicGet<TenantContact | null>(slug, "/contact-info"),
    publicGet<Faq[]>(slug, "/faqs"),
  ]);

  const navItems = buildSiteNav({ hasFaqs: faqs.length > 0 });
  const logo = mediaUrl(tenant.logo_file);
  const hasOfficeInfo = Boolean(contact?.registered_office || contact?.branch_office);
  const hasSocial = Boolean(contact?.facebook_url || contact?.instagram_url || contact?.youtube_url);

  return (
    <footer className="mt-32 bg-light-blue py-8">
      <div className="custom-container mx-auto px-4">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="flex flex-col gap-4 md:max-w-1/4">
            {logo && <Image src={logo} alt={tenant.name} width={300} height={100} />}
            {contact?.opening_hours && (
              <div className="flex items-start gap-2">
                <Clock size={16} className="mt-1" />
                <div>
                  <p>Opening Hours:</p>
                  <p>{contact.opening_hours}</p>
                </div>
              </div>
            )}
            {contact?.phone_primary && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="mt-0.5 flex-shrink-0" />
                <div className="flex items-center gap-1">
                  <span className="block opacity-80">Call on:</span>
                  <a href={`tel:${contact.phone_primary}`} className="hover:underline">
                    {contact.phone_primary}
                  </a>
                  {contact.phone_secondary && (
                    <>
                      {" "}
                      |{" "}
                      <a href={`tel:${contact.phone_secondary}`} className="hover:underline">
                        {contact.phone_secondary}
                      </a>
                    </>
                  )}
                </div>
              </div>
            )}
            {contact?.email && (
              <div className="flex flex-nowrap items-center gap-1 max-md:hidden">
                <Mail size={16} />
                <a href={`mailto:${contact.email}`}>
                  <span className="max-lg:hidden">Mail us:</span> {contact.email}
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h3>Useful Links</h3>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link key={item.name} href={item.path} className="transition-colors hover:text-blue-600">
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h3>Office Information&apos;s</h3>
            {hasOfficeInfo && (
              <>
                {contact?.registered_office && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-1" />
                    <p>Registration Office: {contact.registered_office}</p>
                  </div>
                )}
                {contact?.branch_office && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-1" />
                    <p>Branch Office: {contact.branch_office}</p>
                  </div>
                )}
              </>
            )}

            {hasSocial && (
              <div className="mt-4 flex items-center gap-4">
                <div>Social Links: </div>
                <div className="flex items-center gap-4">
                  {contact?.facebook_url && (
                    <Link href={contact.facebook_url} target="_blank" rel="noopener noreferrer">
                      <Image src="/svg/facebook.svg" alt="facebook logo" width={32} height={32} />
                    </Link>
                  )}
                  {contact?.instagram_url && (
                    <Link href={contact.instagram_url} target="_blank" rel="noopener noreferrer">
                      <Image src="/svg/instagram.svg" alt="instagram logo" width={32} height={32} />
                    </Link>
                  )}
                  {contact?.youtube_url && (
                    <Link href={contact.youtube_url} target="_blank" rel="noopener noreferrer">
                      <Image src="/svg/youtube.svg" alt="youtube logo" width={32} height={32} />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="-mb-4 mt-8 border-t border-blue-200 pt-4">
          <p className="text-center text-sm">
            {contact?.copyright_text ?? `© ${new Date().getFullYear()} ${tenant.name}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
