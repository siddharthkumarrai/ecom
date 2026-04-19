import { ProductCard } from "@/components/store/product/ProductCard";
import type { Product } from "@/lib/store/types";

export function ProductGrid({ title, products }: { title: string; products: Product[] }) {
  return (
    <section>
      <h2 className="border-b border-zinc-200 pb-2 text-[24px] font-semibold">{title}</h2>
      <div className="mt-1 border-t-2 border-brand-yellow/70 pt-1">
        {products.slice(0, 6).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

