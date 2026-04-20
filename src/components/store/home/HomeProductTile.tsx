import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/store/types";
import { CompareToggleButton } from "@/components/store/compare/CompareToggleButton";
import { AnimatedCartButton } from "@/components/store/product/AnimatedCartButton";
import { WishlistHeartButton } from "@/components/store/wishlist/WishlistHeartButton";

export function HomeProductTile({ product }: { product: Product }) {
  return (
    <article className="group relative overflow-hidden border-r border-zinc-200 bg-white transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.12)] last:border-r-0">
      <Link href={`/products/${product.slug}`} className="block p-2.5 transition-colors duration-200 group-hover:bg-zinc-50/40">
        <p className="line-clamp-1 text-[10px] text-zinc-400">{product.brandName || "Everstar"}</p>
        <h3 className="mt-1 line-clamp-2 min-h-8 text-[12px] font-semibold leading-4 text-[#1e63b8] group-hover:underline">
          {product.name}
        </h3>
        <div className="relative mt-2 aspect-[1.2/1] w-full">
          <Image
            src={product.image || "/hero-placeholder.svg"}
            alt={product.name}
            fill
            sizes="180px"
            className="object-contain p-1"
          />
        </div>
      </Link>
      <div className="flex items-center justify-between px-2.5 pb-2.5 transition-colors duration-200 group-hover:bg-zinc-50/40">
        <span className="text-xl font-medium text-zinc-900">₹ {product.sellingPrice ?? product.price}</span>
        <AnimatedCartButton ariaLabel={`Add ${product.name} to cart`} />
      </div>
      <div className="h-10 overflow-hidden border-t border-zinc-200 bg-zinc-50/40 px-2.5 py-2">
        <div className="pointer-events-none flex items-center gap-3 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
          <CompareToggleButton productId={product.id} variant="inline" />
          <WishlistHeartButton productId={product.id} variant="inline" />
        </div>
      </div>
    </article>
  );
}
