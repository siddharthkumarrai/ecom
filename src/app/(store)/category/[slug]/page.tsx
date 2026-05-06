import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CategoryProductsCatalog } from "@/components/store/category/CategoryProductsCatalog";
import { StoreBottomSections } from "@/components/store/layout/StoreBottomSections";
import { getCategoryBySlugOrMock, getProductsByCategorySlugOrMock, getSiteConfigOrMock } from "@/lib/store/data";
import { buildCanonical, buildOgImage, getSiteSeoSettings } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

function summarizeCategoryDescription(categoryName: string, products: Array<{ name: string; specifications: Array<{ value: string }> }>) {
  const specs = products
    .slice(0, 3)
    .flatMap((product) => product.specifications.slice(0, 1).map((spec) => spec.value))
    .filter(Boolean)
    .join(", ");
  const base = `Buy ${categoryName} components online in India with fast dispatch and trusted quality.`;
  const full = specs ? `${base} Popular specs: ${specs}.` : base;
  return full.length > 160 ? `${full.slice(0, 157)}...` : full;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ category }, { products }, seo] = await Promise.all([
    getCategoryBySlugOrMock(slug),
    getProductsByCategorySlugOrMock(slug, 24),
    getSiteSeoSettings(),
  ]);

  if (!category) {
    return {
      title: "Category not found",
      description: seo.defaultDescription,
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name} Components | Buy ${category.name} Online India`;
  const description = summarizeCategoryDescription(category.name, products);
  const canonical = buildCanonical(`/category/${category.slug}`);
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
      images: [{ url: socialImage, alt: `${category.name} components` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [{ category }, { products: categoryProducts }, { config }] = await Promise.all([
    getCategoryBySlugOrMock(slug),
    getProductsByCategorySlugOrMock(slug, 200),
    getSiteConfigOrMock(),
  ]);
  if (!category) return notFound();
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: buildCanonical("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Category",
        item: buildCanonical("/category/all"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: buildCanonical(`/category/${category.slug}`),
      },
    ],
  };

  return (
    <main className="space-y-4 pb-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <CategoryProductsCatalog
        categoryName={category.name}
        categorySlug={category.slug}
        products={categoryProducts}
        actionButtonBg={config.appearance.productActionButtonBg}
        actionButtonHoverBg={config.appearance.productActionButtonHoverBg}
      />
      <Suspense fallback={<div className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white/80" />}>
        <StoreBottomSections />
      </Suspense>
    </main>
  );
}
