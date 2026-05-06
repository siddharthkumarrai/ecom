import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { getProductBySlugOrMock } from "@/lib/store/data";
import { RatingStars } from "@/components/store/product/RatingStars";
import { ProductDetailClient } from "@/components/store/product/ProductDetailClient";
import { ProductDetailTabs } from "@/components/store/product/ProductDetailTabs";
import { RelatedProductsRow } from "@/components/store/product/RelatedProductsRow";
import { getProductsByCategorySlugOrMock, getSiteConfigOrMock } from "@/lib/store/data";
import { WishlistHeartButton } from "@/components/store/wishlist/WishlistHeartButton";
import { ProductImageGallery } from "@/components/store/product/ProductImageGallery";
import { StoreBottomSections } from "@/components/store/layout/StoreBottomSections";
import { CompareToggleButton } from "@/components/store/compare/CompareToggleButton";
import { buildCanonical, buildOgImage, getSiteSeoSettings } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

function summarizeDescription(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= 160) return normalized;
  return `${normalized.slice(0, 157)}...`;
}

function getProductDescription(product: {
  description: string;
  name: string;
  specifications: Array<{ key: string; value: string }>;
}): string {
  const direct = summarizeDescription(product.description);
  if (direct) return direct;
  const specs = product.specifications
    .slice(0, 4)
    .map((spec) => `${spec.key}: ${spec.value}`.trim())
    .filter((entry) => entry && entry !== ":")
    .join(", ");
  return summarizeDescription(specs || `${product.name} electronic component`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ product }, seo] = await Promise.all([getProductBySlugOrMock(slug), getSiteSeoSettings()]);

  if (!product) {
    return {
      title: "Product not found",
      description: seo.defaultDescription,
      robots: { index: false, follow: false },
    };
  }

  const title = `${product.name} | Buy Online | ${seo.siteName}`;
  const description = getProductDescription(product) || seo.defaultDescription;
  const canonical = buildCanonical(`/products/${product.slug}`);
  const socialImage = buildOgImage(product.images?.[0] || product.image || seo.logoUrl || seo.ogImage || seo.defaultOgImage);

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
      images: [{ url: socialImage, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [{ product }, { config }, seo] = await Promise.all([getProductBySlugOrMock(slug), getSiteConfigOrMock(), getSiteSeoSettings()]);
  if (!product) return notFound();
  const { products: relatedProducts } = product.categorySlug
    ? await getProductsByCategorySlugOrMock(product.categorySlug, 10)
    : { products: [] };
  const related = relatedProducts.filter((item) => item.slug !== product.slug).slice(0, 5);
  const discountPercent =
    typeof product.costPrice === "number" && product.costPrice > product.price
      ? Math.round(((product.costPrice - product.price) / product.costPrice) * 100)
      : 0;
  const actionButtonStyle = {
    backgroundColor: config.appearance.productActionButtonBg,
    color: "#18181b",
  } as CSSProperties;
  const specSummary = product.specifications
    .slice(0, 2)
    .map((spec) => spec.value?.trim())
    .filter(Boolean)
    .join(" ");
  const productImageAlt = `${product.name} — ${product.brandName || "YaduInfotech"} ${specSummary || product.partNumber}`.trim();
  const schemaImages = (product.images?.length ? product.images : product.image ? [product.image] : []).map((img) => buildOgImage(img));
  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: getProductDescription(product),
    image: schemaImages.length ? schemaImages : [buildOgImage(seo.logoUrl || seo.ogImage || seo.defaultOgImage)],
    sku: product.partNumber,
    brand: {
      "@type": "Brand",
      name: product.brandName || "YaduInfotech",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: String(product.sellingPrice ?? product.price),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: buildCanonical(`/products/${product.slug}`),
    },
  };
  if ((product.reviewCount ?? 0) > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number((product.rating || 0).toFixed(1)),
      reviewCount: product.reviewCount ?? 0,
    };
  }

  return (
    <main className="-mx-[var(--content-px-mobile)] space-y-5 md:-mx-[var(--content-px-desktop)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <nav aria-label="Breadcrumb" className="hidden text-xs text-zinc-500 md:block">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-zinc-700">
              Home
            </Link>
          </li>
          <li className="text-zinc-400">/</li>
          {product.categorySlug ? (
            <>
              <li>
                <Link href={`/category/${product.categorySlug}`} className="hover:text-zinc-700">
                  {product.categorySlug.toUpperCase()}
                </Link>
              </li>
              <li className="text-zinc-400">/</li>
            </>
          ) : null}
          <li className="line-clamp-1 max-w-[300px] font-medium text-zinc-700">{product.name}</li>
        </ol>
      </nav>
      <section className="grid gap-4 border-b border-zinc-200 bg-white p-2.5 md:grid-cols-[360px_minmax(0,1fr)] md:gap-7 md:rounded-2xl md:border md:p-6">
        <ProductImageGallery name={productImageAlt} images={product.images?.length ? product.images : product.image ? [product.image] : []} />
        <section className="pt-1">
          <h1 className="text-[38px] font-bold leading-[1.08] tracking-tight text-zinc-800 md:text-[34px]">{product.name}</h1>
          <p className="mt-1 text-xs text-zinc-500">({product.reviewCount ?? 0} reviews)</p>
          <div className="mt-1 hidden md:block">
            <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
          </div>
          <p className={`mt-1 text-sm font-semibold ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <button type="button" style={actionButtonStyle} className="rounded-full px-4 py-2 font-semibold transition-opacity hover:opacity-90">
              Message Seller
            </button>
            <WishlistHeartButton productId={product.id} variant="inline" />
            <CompareToggleButton productId={product.id} variant="inline" />
          </div>

          {product.brandName ? (
            <div className="mt-4 border-t border-zinc-200 pt-3">
              <p className="text-xs text-zinc-500">Brand</p>
              <div className="mt-1 flex items-center gap-2">
                {product.brandLogo ? (
                  <Image src={product.brandLogo} alt={product.brandName} width={120} height={28} className="h-7 w-auto object-contain" />
                ) : null}
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">{product.brandName}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-0.5">
            <p className="text-[37px] font-extrabold leading-none text-zinc-800 md:text-[40px]">Unit Price: ₹ {product.sellingPrice ?? product.price}</p>
            <p className="text-xs font-medium text-zinc-500">PartNumber: {product.partNumber}</p>
            {typeof product.costPrice === "number" && product.costPrice > product.price ? (
              <p className="text-base text-zinc-400 line-through">₹ {product.costPrice}</p>
            ) : null}
            {discountPercent > 0 ? <span className="mb-1 text-sm font-semibold text-emerald-600">{discountPercent}% off</span> : null}
          </div>

          <ProductDetailClient
            product={product}
            buttonBg={config.appearance.productActionButtonBg}
            buttonHoverBg={config.appearance.productActionButtonHoverBg}
          />
        </section>
      </section>

      <ProductDetailTabs product={product} slug={slug} />

      <RelatedProductsRow products={related} />

      <Suspense fallback={<div className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white/80" />}>
        <StoreBottomSections />
      </Suspense>
    </main>
  );
}
