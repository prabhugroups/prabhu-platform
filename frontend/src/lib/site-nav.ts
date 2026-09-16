export interface SiteNavItem {
  name: string;
  path: string;
  dropdown?: { name: string; path: string }[];
}

/** The legacy prabhucablecar-web site's fixed header/footer nav, ported as a
 * literal structure rather than driven by the generic `NavItem` admin
 * resource — every tenant on the platform gets this same shell for now.
 * FAQs (and Projects, once Phase 3 adds that section) are injected only
 * when the tenant actually has data, matching legacy's own behavior. */
export function buildSiteNav({ hasFaqs }: { hasFaqs: boolean }): SiteNavItem[] {
  const items: SiteNavItem[] = [
    { name: "Home", path: "/" },
    {
      name: "About Us",
      path: "/about",
      dropdown: [
        { name: "Overview", path: "/about" },
        { name: "Strategic Objectives", path: "/about/strategic-objectives" },
        { name: "Corporate Governance", path: "/about/corporate-governance" },
        { name: "Board Of Directors", path: "/about/directors" },
        { name: "Management Team", path: "/about/team" },
      ],
    },
    { name: "Notice", path: "/notice" },
    { name: "Portfolio", path: "/portfolio" },
    { name: "Gallery", path: "/gallery" },
    { name: "Reports", path: "/legal" },
    { name: "Contact Us", path: "/contact" },
  ];

  if (hasFaqs) {
    const insertIndex = items.findIndex((item) => item.name === "Gallery");
    items.splice(insertIndex, 0, { name: "FAQs", path: "/faqs" });
  }

  return items;
}
