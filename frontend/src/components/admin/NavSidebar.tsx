"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/app/admin/login/actions";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  title: string;
  links: NavLink[];
}

/** Shared by AdminSidebar and SuperAdminSidebar — same shell, different
 * title/links. Nav items reuse Button's variants directly (not the Button
 * component itself) so a plain <Link>/<button> can carry the styling
 * without an extra asChild/Slot indirection. */
export function NavSidebar({ title, links }: Props) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
      <div className="px-4 py-4 text-sm font-bold">{title}</div>
      <Separator />
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(buttonVariants({ variant: active ? "default" : "ghost" }), "w-full justify-start gap-2")}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <form action={adminLogout} className="p-3">
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start gap-2 text-muted-foreground")}
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </form>
    </aside>
  );
}
