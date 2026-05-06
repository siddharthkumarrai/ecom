import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductGrid } from "@/components/store/home/ProductGrid";
import { getBrandBySlugOrMock, getProductsByBrandSlugOrMock } from "@/lib/store/data";
import { buildCanonical, buildOgImage, getSiteSeoSettings } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ brand }, { products }, seo] = await Promise.all([getBrandBySlugOrMock(slug), getProductsByBrandSlugOrMock(slug), getSiteSeoSettings()]);

  if (!brand) {
    return {
      title: "Brand not found",
      description: seo.defaultDescription,
      robots: { index: false, follow: false },
    };
  }

  const title = `${brand.name} Components`;
  const description = `Browse ${brand.name} electronic components and buy online in India.`;
  const canonical = buildCanonical(`/brands/${brand.slug}`);
  const socialImage = buildOgImage(products[0]?.image || seo.logoUrl || seo.ogImage || seo.defaultOgImage);

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
      images: [{ url: socialImage, alt: brand.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const [{ brand }, { products: brandProducts }] = await Promise.all([getBrandBySlugOrMock(slug), getProductsByBrandSlugOrMock(slug)]);
  if (!brand) return notFound();

  return (
    <main>
      <h1 className="text-3xl font-bold">{brand.name}</h1>
      <ProductGrid title={`${brand.name} Catalog`} products={brandProducts} />
    </main>
  );
}

