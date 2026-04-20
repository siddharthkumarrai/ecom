import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlugOrMock } from "@/lib/store/data";
import { RatingStars } from "@/components/store/product/RatingStars";
import { ProductDetailClient } from "@/components/store/product/ProductDetailClient";
import { ProductDetailTabs } from "@/components/store/product/ProductDetailTabs";
import { RelatedProductsRow } from "@/components/store/product/RelatedProductsRow";
import { getProductsByCategorySlugOrMock, getSiteConfigOrMock } from "@/lib/store/data";
import { WishlistHeartButton } from "@/components/store/wishlist/WishlistHeartButton";
import { ProductImageGallery } from "@/components/store/product/ProductImageGallery";
import { StoreBottomSections } from "@/components/store/layout/StoreBottomSections";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [{ product }, { config }] = await Promise.all([getProductBySlugOrMock(slug), getSiteConfigOrMock()]);
  if (!product) return notFound();
  const { products: relatedProducts } = product.categorySlug
    ? await getProductsByCategorySlugOrMock(product.categorySlug, 10)
    : { products: [] };
  const related = relatedProducts.filter((item) => item.slug !== product.slug).slice(0, 5);
  const discountPercent =
    typeof product.costPrice === "number" && product.costPrice > product.price
      ? Math.round(((product.costPrice - product.price) / product.costPrice) * 100)
      : 0;

  return (
    <main className="-mx-[var(--content-px-mobile)] space-y-5 md:-mx-[var(--content-px-desktop)]">
      <nav aria-label="Breadcrumb" className="text-xs text-zinc-500">
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
      <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-[340px_minmax(0,1fr)] md:p-6">
        <ProductImageGallery name={product.name} images={product.images?.length ? product.images : product.image ? [product.image] : []} />
        <section>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-800 md:text-[34px]">{product.name}</h1>
          <p className="mt-1 text-xs text-zinc-500">Partnumber: {product.partNumber}</p>
          <div className="mt-1">
            <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
          </div>
          <p className={`mt-1 text-sm font-semibold ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <button className="rounded-full bg-brand-yellow px-4 py-2 font-semibold text-zinc-900">Message Seller</button>
            <div className="inline-flex items-center gap-2 text-zinc-500">
              <WishlistHeartButton productId={product.id} />
              <span>Wishlist</span>
            </div>
            <span className="text-zinc-500">⇄ Compare</span>
          </div>

          {product.brandName ? <p className="mt-4 text-sm font-semibold uppercase italic tracking-wide text-zinc-700">{product.brandName}</p> : null}

          <div className="mt-4 flex flex-wrap items-end gap-2.5">
            <p className="text-3xl font-extrabold text-zinc-800 md:text-[40px]">Unit Price: ₹ {product.sellingPrice ?? product.price}</p>
            {typeof product.costPrice === "number" && product.costPrice > product.price ? (
              <p className="text-lg text-zinc-400 line-through">₹ {product.costPrice}</p>
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
