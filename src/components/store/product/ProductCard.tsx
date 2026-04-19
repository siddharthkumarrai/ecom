import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/store/types";
import { RatingStars } from "@/components/store/product/RatingStars";
import { WishlistHeartButton } from "@/components/store/wishlist/WishlistHeartButton";

export function ProductCard({ product }: { product: Product }) {
  const discountPercent =
    typeof product.costPrice === "number" && product.costPrice > product.price
      ? Math.round(((product.costPrice - product.price) / product.costPrice) * 100)
      : 0;
  return (
    <article className="flex items-start gap-3 py-3">
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-sm border border-zinc-200 bg-zinc-100">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="48px" />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${product.slug}`} className="line-clamp-2 text-[13px] font-semibold text-brand-blue hover:underline">
            {product.name}
          </Link>
          <WishlistHeartButton productId={product.id} className="h-7 w-7" />
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">{product.partNumber}</p>
        <div className="mt-1">
          <RatingStars rating={product.rating} count={product.reviewCount} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          {typeof product.costPrice === "number" && product.costPrice > product.price ? (
            <span className="text-[11px] text-zinc-400 line-through">₹ {product.costPrice}</span>
          ) : null}
          <p className="text-[13px] font-semibold">₹ {product.sellingPrice ?? product.price}</p>
          {discountPercent > 0 ? <span className="text-[11px] font-semibold text-emerald-600">{discountPercent}% off</span> : null}
        </div>
        {product.stock > 0 && product.stock < 5 ? <p className="mt-1 text-[11px] font-semibold text-rose-600">{product.stock} remaining</p> : null}
      </div>
    </article>
  );
}

