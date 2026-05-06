import Link from "next/link";
import type { Metadata } from "next";
import { connectDB } from "@/lib/db/mongoose";
import { Brand } from "@/lib/db/models/Brand.model";
import { brands as mockBrands } from "@/lib/store/mock-data";
import { buildCanonical, buildOgImage, getSiteSeoSettings } from "@/lib/seo";

type BrandLink = {
  id: string;
  name: string;
  slug: string;
};

async function getAllBrandsForPage(): Promise<BrandLink[]> {
  try {
    await connectDB();
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 }).select("name slug").lean();
    if (brands.length) {
      return brands.map((brand) => ({
        id: String(brand._id),
        name: brand.name,
        slug: brand.slug,
      }));
    }
  } catch {
    // Fallback to mock data.
  }

  return mockBrands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [seo, brands] = await Promise.all([getSiteSeoSettings(), getAllBrandsForPage()]);
  const title = `Brands | ${seo.siteName}`;
  const description = `Explore ${brands.length} electronics brands available on ${seo.siteName}.`;
  const canonical = buildCanonical("/brands");
  const socialImage = buildOgImage(seo.logoUrl || seo.ogImage || seo.defaultOgImage);

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: [{ url: socialImage, alt: `${seo.siteName} brands` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function BrandsPage() {
  const brands = await getAllBrandsForPage();

  return (
    <main className="space-y-4">
      <header className="rounded border border-zinc-200 bg-white px-4 py-4 md:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">Brands</h1>
        <p className="mt-1 text-sm text-zinc-500">Browse all available component brands.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 rounded border border-zinc-200 bg-white p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
          >
            {brand.name}
          </Link>
        ))}
      </section>
    </main>
  );
}

