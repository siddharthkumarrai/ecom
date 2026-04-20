import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/store/types";
import { AnimatedCartButton } from "@/components/store/product/AnimatedCartButton";
import { WishlistHeartButton } from "@/components/store/wishlist/WishlistHeartButton";

export function RelatedProductsRow({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <section className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-base font-semibold text-zinc-800">Related products</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        {products.slice(0, 5).map((product) => (
          <article key={product.id} className="group relative rounded border border-zinc-200 p-2 hover:shadow-sm">
            <div className="absolute right-2 top-2 z-10">
              <WishlistHeartButton productId={product.id} className="h-7 w-7" />
            </div>
            <Link href={`/products/${product.slug}`} className="block">
              <p className="line-clamp-2 min-h-8 text-[11px] text-blue-700">{product.name}</p>
              <div className="relative mt-1 h-24 w-full bg-zinc-50">
                {product.image ? <Image src={product.image} alt={product.name} fill className="object-contain p-1" sizes="140px" /> : null}
              </div>
            </Link>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-800">₹ {product.sellingPrice ?? product.price}</p>
              <AnimatedCartButton
                ariaLabel={`Add ${product.name} to cart`}
                productId={product.id}
                className="h-8 w-16 lg:h-9 lg:w-[72px]"
                iconClassName="h-[16px] w-[36px] lg:h-[19px] lg:w-[44px]"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
