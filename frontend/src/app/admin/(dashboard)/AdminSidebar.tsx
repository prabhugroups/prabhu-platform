"use client";

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
} from "lucide-react";
import { NavSidebar, type NavLink } from "@/components/admin/NavSidebar";

/** Order mirrors the legacy CRM's sidebar (prabhucablecar-web's
 * components/Sidebar.tsx): Dashboard, Home Data, Banner, Popup, Gallery,
 * About Us Data, Portfolio, Team, Documents & Notice, Contact List, Share
 * Request, FAQs, Settings, SEO Settings — plus this platform's own
 * Navigation (nav-items) and Shareholders sections, which legacy never
 * had. */
const LINKS: NavLink[] = [
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
  return <NavSidebar title="Admin CMS" links={LINKS} />;
}
