/** The page picker list for per-page SEO — ported from the legacy CRM's SEO
 * Settings page (13 fixed pages). `key` is what's stored as
 * `page_seo.page_key` and read by each public page's generateMetadata. */
export const SEO_PAGES = [
  { key: "home", label: "Home" },
  { key: "about-overview", label: "About: Overview" },
  { key: "about-strategic-objectives", label: "About: Strategic Objectives" },
  { key: "about-corporate-governance", label: "About: Corporate Governance" },
  { key: "about-directors", label: "Board of Directors" },
  { key: "about-team", label: "Management Team" },
  { key: "notice", label: "Notice Board" },
  { key: "projects", label: "Projects" },
  { key: "faqs", label: "FAQs" },
  { key: "gallery", label: "Gallery" },
  { key: "portfolio", label: "Portfolio" },
  { key: "contact", label: "Contact" },
  { key: "request-share", label: "Request Share" },
] as const;
