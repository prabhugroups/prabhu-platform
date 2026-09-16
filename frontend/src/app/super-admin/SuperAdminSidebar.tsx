"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogOut, UsersRound } from "lucide-react";
import { adminLogout } from "@/app/admin/login/actions";

const LINKS = [
  { href: "/super-admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/super-admin/admin-users", label: "Admin Users", icon: UsersRound },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-white">
      <div className="border-b px-4 py-4 font-bold">Super Admin</div>
      <nav className="flex-1 space-y-1 p-3">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                active ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <form action={adminLogout} className="border-t p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </form>
    </aside>
  );
}
