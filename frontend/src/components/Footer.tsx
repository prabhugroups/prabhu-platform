import Link from "next/link";
import { publicGet } from "@/lib/api";
import { getTenantSlug } from "@/lib/get-tenant";
import type { NavItem, Tenant } from "@/lib/types";

export async function Footer({ tenant }: { tenant: Tenant }) {
  const slug = await getTenantSlug();
  const allNav = await publicGet<NavItem[]>(slug, "/nav-items");
  const footerNav = allNav
    .filter((n) => n.location === "footer" && n.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <footer className="mt-auto border-t bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div>
            <p className="text-lg font-bold">{tenant.name}</p>
            {tenant.footer_text && <p className="mt-2 max-w-sm text-sm text-gray-600">{tenant.footer_text}</p>}
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {footerNav.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                target={item.is_external ? "_blank" : undefined}
                className="text-sm text-gray-600 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
