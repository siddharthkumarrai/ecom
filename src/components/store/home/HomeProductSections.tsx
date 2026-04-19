import { ProductGrid } from "@/components/store/home/ProductGrid";
import type { Product } from "@/lib/store/types";

type HomeProductSectionLike = { id: string; type: string; title: string };

export function HomeProductSections({ sections, products }: { sections: HomeProductSectionLike[]; products: Product[] }) {
  const isOnSale = (p: Product) => typeof p.costPrice === "number" && p.costPrice > p.price;

  const featuredProducts = products.slice(0, 6);
  const onSaleProducts = products.filter(isOnSale).slice(0, 6);
  const topRatedProducts = [...products]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    .slice(0, 6);

  return (
    <section className="mt-8 space-y-6">
      {sections.map((section) => {
        const list =
          section.type === "onsale"
            ? onSaleProducts
            : section.type === "topRated"
              ? topRatedProducts
              : featuredProducts;

        return <ProductGrid key={section.id} title={section.title} products={list} />;
      })}
    </section>
  );
}

