import Image from "next/image";
import Link from "next/link";
import { publicGet, mediaUrl } from "@/lib/api";
import { getTenantSlug } from "@/lib/get-tenant";
import type { NavItem, Tenant } from "@/lib/types";
import { MobileNav } from "@/components/MobileNav";

export async function Header({ tenant }: { tenant: Tenant }) {
  const slug = await getTenantSlug();
  const allNav = await publicGet<NavItem[]>(slug, "/nav-items");
  const headerNav = allNav
    .filter((n) => n.location === "header" && n.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({ ...item, children: allNav.filter((c) => c.parent_id === item.id) }));

  const logo = mediaUrl(tenant.logo_file);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          {logo ? (
            <Image src={logo} alt={tenant.name} width={40} height={40} className="h-10 w-auto" />
          ) : null}
          <span>{tenant.name}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {headerNav.map((item) => (
            <div key={item.id} className="group relative">
              <Link
                href={item.url}
                target={item.is_external ? "_blank" : undefined}
                className="text-sm font-medium text-gray-700 hover:text-primary"
              >
                {item.label}
              </Link>
              {item.children.length > 0 && (
                <div className="invisible absolute left-0 top-full min-w-40 rounded-md border bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                  {item.children
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((child) => (
                      <Link
                        key={child.id}
                        href={child.url}
                        className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {child.label}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <MobileNav items={headerNav} />
      </div>
    </header>
  );
}
