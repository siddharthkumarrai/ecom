import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/store/types";

export function ProductMiniCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex items-start gap-2 rounded border border-zinc-200 bg-white p-2 hover:border-zinc-300"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-50">
        <Image
          src={product.image || "/hero-placeholder.svg"}
          alt={product.name}
          fill
          sizes="56px"
          className="object-contain p-1.5"
        />
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[11px] font-semibold text-[#1e63b8]">
          {product.name}
        </p>
        <p className="mt-1 text-xs font-bold text-zinc-900">
          ₹ {Number(product.price || product.sellingPrice || 0).toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
