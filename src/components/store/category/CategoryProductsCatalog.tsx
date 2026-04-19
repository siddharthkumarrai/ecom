import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Product } from "@/lib/store/types";
import { RatingStars } from "@/components/store/product/RatingStars";
import { WishlistHeartButton } from "@/components/store/wishlist/WishlistHeartButton";

interface CategoryProductsCatalogProps {
  categoryName: string;
  categorySlug: string;
  products: Product[];
  actionButtonBg: string;
  actionButtonHoverBg: string;
}

function getDiscountPercent(product: Product) {
  if (typeof product.costPrice !== "number" || product.costPrice <= product.price) return 0;
  return Math.round(((product.costPrice - product.price) / product.costPrice) * 100);
}

export function CategoryProductsCatalog({
  categoryName,
  categorySlug,
  products,
  actionButtonBg,
  actionButtonHoverBg,
}: CategoryProductsCatalogProps) {
  return (
    <section className="rounded border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3 md:px-6">
        <nav className="text-xs text-zinc-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-zinc-700">
                Home
              </Link>
            </li>
            <li className="text-zinc-400">/</li>
            <li>
              <Link href="/category/all" className="hover:text-zinc-700">
                Category
              </Link>
            </li>
            <li className="text-zinc-400">/</li>
            <li className="font-medium text-zinc-700">{categoryName}</li>
          </ol>
        </nav>
        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-zinc-900 md:text-4xl">{categoryName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {products.length} product{products.length === 1 ? "" : "s"} in {categoryName}
        </p>
      </div>

      {products.length ? (
        <div className="p-3 md:p-4">
          <h2 className="border-b border-zinc-200 pb-2 text-3xl font-semibold text-zinc-900">{categoryName} Products</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-4">
            {products.map((product) => {
              const discountPercent = getDiscountPercent(product);
              return (
                <article
                  key={product.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm"
                >
                  <div className="absolute right-1.5 top-1.5 z-10">
                    <WishlistHeartButton productId={product.id} className="h-7 w-7" />
                  </div>

                  <Link href={`/products/${product.slug}`} className="flex h-full flex-col">
                    <div className="relative mx-1.5 mt-1.5 aspect-square rounded border border-zinc-100 bg-zinc-50 sm:mx-2 sm:mt-2">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-1.5"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                        />
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col px-2 pb-2 pt-1.5 sm:px-2.5 sm:pb-2.5 sm:pt-2">
                      <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-zinc-800 group-hover:text-blue-700 sm:text-[12px]">{product.name}</p>
                      <p className="mt-1 line-clamp-1 text-[10px] text-zinc-500">{product.partNumber}</p>

                      <div className="mt-1">
                        <RatingStars rating={product.rating} count={product.reviewCount} />
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="text-[13px] font-semibold text-zinc-900 sm:text-[14px]">₹ {product.sellingPrice ?? product.price}</span>
                        {typeof product.costPrice === "number" && product.costPrice > product.price ? (
                          <span className="text-[11px] text-zinc-400 line-through">₹ {product.costPrice}</span>
                        ) : null}
                        {discountPercent > 0 ? <span className="text-[11px] font-semibold text-emerald-600">{discountPercent}% off</span> : null}
                      </div>

                      <div className="mt-auto pt-1.5">
                        {product.stock > 0 && product.stock < 5 ? (
                          <p className="text-[11px] font-semibold text-rose-600">{product.stock} left in stock</p>
                        ) : (
                          <p className="text-[11px] text-zinc-500">Category: {categorySlug.toUpperCase()}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="px-4 py-10 text-center md:px-6">
          <p className="text-base font-medium text-zinc-700">No products available in this category right now.</p>
          <p className="mt-1 text-sm text-zinc-500">Please check again later or explore another category.</p>
          <Link
            href="/category/all"
            className="mt-4 inline-flex rounded-full bg-[var(--category-btn-bg)] px-5 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-[var(--category-btn-hover-bg)]"
            style={
              {
                "--category-btn-bg": actionButtonBg,
                "--category-btn-hover-bg": actionButtonHoverBg,
              } as CSSProperties
            }
          >
            View all categories
          </Link>
        </div>
      )}
    </section>
  );
}
