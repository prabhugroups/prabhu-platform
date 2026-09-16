import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import { publicGet, mediaUrl } from "@/lib/api";
import { getTenantSlug } from "@/lib/get-tenant";
import type { Faq, Tenant, TenantContact } from "@/lib/types";
import { MobileNav } from "@/components/MobileNav";
import { buildSiteNav } from "@/lib/site-nav";

/** Ported from prabhucablecar-web's Navbar.tsx: a top contact-info strip,
 * the fixed mega-nav (see lib/site-nav.ts), and a "My Request" dropdown
 * gated on the shareholder module. Dropdowns are pure CSS `group-hover` —
 * no client JS needed for the desktop nav, only the mobile slide-in menu is
 * a client component. */
export async function Header({ tenant }: { tenant: Tenant }) {
  const slug = await getTenantSlug();
  const [contact, faqs] = await Promise.all([
    publicGet<TenantContact | null>(slug, "/contact-info"),
    publicGet<Faq[]>(slug, "/faqs"),
  ]);

  const navItems = buildSiteNav({ hasFaqs: faqs.length > 0 });
  const logo = mediaUrl(tenant.logo_file);
  const showTopStrip = Boolean(contact?.phone_primary || contact?.email || contact?.location);

  return (
    <div className="sticky top-0 z-50 mb-2 bg-white shadow-lg md:mb-3">
      {showTopStrip && (
        <header className="bg-primary">
          <div className="custom-container flex items-center justify-between py-3 text-xs text-white md:py-4 md:text-sm">
            <div className="flex items-center gap-2 lg:w-1/2">
              {contact?.phone_primary && (
                <>
                  <Phone size={16} />
                  <span>
                    <span className="max-lg:hidden">Call on: </span>
                    <a href={`tel:${contact.phone_primary}`}>{contact.phone_primary}</a>
                    {contact.phone_secondary && (
                      <a href={`tel:${contact.phone_secondary}`} className="max-sm:hidden">
                        {" "}
                        | {contact.phone_secondary}
                      </a>
                    )}
                  </span>
                </>
              )}
            </div>
            <div className="flex justify-between md:w-1/2">
              {contact?.email && (
                <div className="flex flex-nowrap items-center gap-1 max-md:hidden">
                  <Mail size={16} />
                  <a href={`mailto:${contact.email}`}>
                    <span className="max-lg:hidden">Mail us:</span> {contact.email}
                  </a>
                </div>
              )}
              {contact?.location && (
                <div className="flex flex-nowrap items-center gap-1">
                  <MapPin size={16} />
                  <span>
                    <span className="max-lg:hidden">Reach us:</span> {contact.location}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <nav className="custom-container flex items-center justify-between max-md:py-2">
        <Link href="/" className="flex items-center gap-2">
          {logo ? (
            <Image
              src={logo}
              alt={tenant.name}
              height={64}
              width={192}
              className="h-16 w-32 object-contain md:w-48"
              priority
            />
          ) : (
            <span className="text-lg font-bold">{tenant.name}</span>
          )}
        </Link>

        <div className="flex items-center gap-10 text-primary max-lg:hidden">
          {navItems.map((item) => (
            <div key={item.name} className="group relative cursor-pointer text-xs font-bold md:text-sm">
              <div className="flex items-center gap-2">
                <Link href={item.path} className="font-normal">
                  {item.name}
                </Link>
                {item.dropdown && (
                  <ChevronDown
                    size={16}
                    className="text-primary transition-transform duration-300 group-hover:rotate-180"
                  />
                )}
              </div>
              {item.dropdown && (
                <div className="invisible absolute left-0 top-4 z-10 mt-2 w-48 rounded-lg bg-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                  {item.dropdown.map((sub) => (
                    <Link key={sub.name} href={sub.path} className="block px-4 py-2 hover:bg-gray-100">
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {tenant.shareholder_module_enabled && (
            <div className="group relative">
              <button className="button flex items-center gap-1">
                My Request
                <ChevronDown size={16} className="transition-transform duration-300 group-hover:rotate-180" />
              </button>
              <div className="invisible absolute right-0 top-full z-10 w-64 rounded border border-gray-100 bg-white text-primary opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                <div className="py-2">
                  <Link href="/request-share" className="block px-4 py-2 text-sm font-medium hover:bg-gray-100">
                    Request Share
                  </Link>
                  <div className="my-1 border-t border-gray-100" />
                  <Link href="/contact" className="block px-4 py-2 text-sm font-medium hover:bg-gray-100">
                    Inquiry Now
                  </Link>
                </div>
              </div>
            </div>
          )}
          <MobileNav items={navItems} showApplyOnline={tenant.shareholder_module_enabled} />
        </div>
      </nav>
    </div>
  );
}
