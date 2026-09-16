/** Document & Notice categories — ported from prabhucablecar-web's admin
 * Dropdown options. "annual_reports" is the only category that routes to
 * the public /legal ("Reports") page; everything else shows under /notice. */
export const DOCUMENT_CATEGORIES = [
  "notice_board",
  "company_news",
  "press_media",
  "procurement",
  "career",
  "downloads",
  "annual_reports",
] as const;

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  notice_board: "Notice Board",
  company_news: "Company News",
  press_media: "Press & Media",
  procurement: "Procurement",
  career: "Career",
  downloads: "Downloads",
  annual_reports: "Annual Reports",
};

export const LEGAL_CATEGORIES = ["annual_reports"];
export const NOTICE_CATEGORIES = DOCUMENT_CATEGORIES.filter((c) => !LEGAL_CATEGORIES.includes(c));
