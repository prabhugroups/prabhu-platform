import type { Metadata } from "next";
import Image from "next/image";
import { publicGet, mediaUrl } from "@/lib/api";
import { getTenant, getTenantSlug } from "@/lib/get-tenant";
import type { Gallery } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  return { title: "Gallery", description: `Photos and videos from ${tenant.name}.` };
}

export default async function GalleryPage() {
  const slug = await getTenantSlug();
  const galleries = await publicGet<Gallery[]>(slug, "/galleries");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">Gallery</h1>

      {galleries.length === 0 && <p className="mt-6 text-gray-500">No gallery items yet.</p>}

      {galleries.map((gallery) => (
        <section key={gallery.id} className="mt-10">
          <h2 className="text-lg font-semibold">{gallery.title}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {gallery.images.map((image) => {
              const src = mediaUrl(image.file);
              if (!src) return null;
              return (
                <div key={image.id} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src={src}
                    alt={gallery.title}
                    width={300}
                    height={300}
                    className="h-full w-full object-cover"
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
