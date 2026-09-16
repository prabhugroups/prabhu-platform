import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const STATIC_ROUTES = [
  "",
  "/about",
  "/contact",
  "/faqs",
  "/gallery",
  "/legal",
  "/notice",
  "/portfolio",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const base = `https://${host}`;

  return STATIC_ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
