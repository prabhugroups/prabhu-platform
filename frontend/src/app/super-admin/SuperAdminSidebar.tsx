"use client";

import { Building2, UsersRound } from "lucide-react";
import { NavSidebar, type NavLink } from "@/components/admin/NavSidebar";

const LINKS: NavLink[] = [
  { href: "/super-admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/super-admin/admin-users", label: "Admin Users", icon: UsersRound },
];

export function SuperAdminSidebar() {
  return <NavSidebar title="Super Admin" links={LINKS} />;
}
