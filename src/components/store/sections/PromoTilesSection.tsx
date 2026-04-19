import { PromoCard } from "@/components/store/sections/blocks/PromoCard";
import type { SectionRenderProps } from "@/components/store/sections/registry";
import { getProductsByIdsOrMock } from "@/lib/store/data";

export async function PromoTilesSection({ section, siteConfig }: SectionRenderProps) {
  const cardsFromConfig = Array.isArray(section.config.cards) ? section.config.cards : [];
  const cards = cardsFromConfig.length ? cardsFromConfig : siteConfig.homepage.heroCarousel.sideCards;
  if (!cards.length) return null;
  const normalizedCards = cards.slice(0, 3).map((item) => {
    const card = (item ?? {}) as Record<string, unknown>;
    return {
      productId: String(card.productId ?? ""),
      title: String(card.title || "Shop now"),
      subtitle: String(card.subtitle || ""),
      ctaLabel: String(card.ctaLabel || "Shop now"),
      href: String(card.ctaHref ?? card.href ?? card.link ?? "/"),
      imageUrl: String(card.imageUrl ?? card.image ?? ""),
    };
  });
  const productIds = Array.from(
    new Set(
      normalizedCards
        .map((card) => card.productId)
        .filter(Boolean)
    )
  );
  const selectedProducts = productIds.length ? (await getProductsByIdsOrMock(productIds)).products : [];
  const productById = new Map(selectedProducts.map((product) => [product.id, product]));

  return (
    <section className="grid gap-2">
      {normalizedCards.map((card, index) => {
        const selectedProduct = card.productId ? productById.get(card.productId) : undefined;
        const title = selectedProduct?.name || card.title;
        const subtitle = selectedProduct
          ? selectedProduct.partNumber
            ? `${selectedProduct.partNumber} · ₹${selectedProduct.price}`
            : `₹${selectedProduct.price}`
          : card.subtitle;
        const ctaLabel = card.ctaLabel || "Shop now";
        const href = selectedProduct ? `/products/${selectedProduct.slug}` : card.href;
        const imageUrl = selectedProduct?.image || card.imageUrl;
        return (
          <PromoCard
            key={`${title || "promo"}-${index + 1}`}
            title={title}
            subtitle={subtitle}
            href={href}
            imageUrl={imageUrl}
            ctaLabel={ctaLabel}
          />
        );
      })}
    </section>
  );
}
