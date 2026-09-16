import type { Metadata } from "next";
import { getTenant, getTenantSlug } from "@/lib/get-tenant";
import { mediaUrl, publicGet } from "@/lib/api";
import type { TenantContact } from "@/lib/types";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  const favicon = mediaUrl(tenant.favicon_file);
  const ogImage = mediaUrl(tenant.default_og_image_file);

  return {
    // Interpolated from the tenant record, never a hardcoded brand name —
    // the legacy audit found 6 of 7 tenants' page fallbacks still literally
    // read "Prabhu Steels - ..." because this was never made tenant-aware.
    title: { default: tenant.name, template: `%s | ${tenant.name}` },
    description: `${tenant.name} — official website`,
    icons: favicon ? [{ rel: "icon", url: favicon }] : undefined,
    openGraph: {
      siteName: tenant.name,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  const slug = await getTenantSlug();
  const contact = await publicGet<TenantContact | null>(slug, "/contact-info");

  const themeStyle = `:root {
    --color-primary: ${tenant.primary_color};
    --color-secondary: ${tenant.secondary_color};
    --color-primary-light: ${tenant.primary_light_color};
  }`;

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: tenant.name,
    ...(tenant.footer_text ? { description: tenant.footer_text } : {}),
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Header tenant={tenant} />
      <main className="flex-1">{children}</main>
      <Footer tenant={tenant} />
      <WhatsAppButton whatsappNumber={contact?.whatsapp_number ?? null} />
    </>
  );
}
