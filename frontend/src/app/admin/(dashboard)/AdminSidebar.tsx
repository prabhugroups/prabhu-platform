"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  GalleryHorizontal,
  Megaphone,
  Image as ImageIcon,
  Info,
  Briefcase,
  Users,
  FileText,
  Mail,
  ClipboardList,
  Menu as MenuIcon,
  HelpCircle,
  Settings,
  Search,
  UserSquare2,
  LogOut,
} from "lucide-react";
import { adminLogout } from "../login/actions";

/** Order mirrors the legacy CRM's sidebar (prabhucablecar-web's
 * components/Sidebar.tsx): Dashboard, Home Data, Banner, Popup, Gallery,
 * About Us Data, Portfolio, Team, Documents & Notice, Contact List, Share
 * Request, FAQs, Settings, SEO Settings — plus this platform's own
 * Navigation (nav-items) and Shareholders sections, which legacy never
 * had. */
const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/home-data", label: "Home Data", icon: Home },
  { href: "/admin/banners", label: "Banner", icon: GalleryHorizontal },
  { href: "/admin/popups", label: "Popup", icon: Megaphone },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/about-data", label: "About Us Data", icon: Info },
  { href: "/admin/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/admin/teams", label: "Team", icon: Users },
  { href: "/admin/documents", label: "Documents & Notice", icon: FileText },
  { href: "/admin/contacts", label: "Contact List", icon: Mail },
  { href: "/admin/applications", label: "Share Request", icon: ClipboardList },
  { href: "/admin/nav-items", label: "Navigation", icon: MenuIcon },
  { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/seo", label: "SEO Settings", icon: Search },
  { href: "/admin/shareholders", label: "Shareholders", icon: UserSquare2 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-white">
      <div className="border-b px-4 py-4 font-bold">Admin CMS</div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
