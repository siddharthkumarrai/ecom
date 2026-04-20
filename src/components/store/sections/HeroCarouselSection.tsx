import { HeroBanner } from "@/components/store/home/HeroBanner";
import type { SectionRenderProps } from "@/components/store/sections/registry";
import { getProductsByIdsOrMock } from "@/lib/store/data";

export async function HeroCarouselSection({ section, siteConfig }: SectionRenderProps) {
  const sectionEyebrow = String(section.config.eyebrow || siteConfig.homepage.hero.eyebrow);
  const slidesFromConfig = Array.isArray(section.config.slides)
    ? section.config.slides
        .map((item) => {
          const slide = (item ?? {}) as Record<string, unknown>;
          return {
            title: String(slide.title ?? ""),
            subtitle: String(slide.subtitle ?? ""),
            ctaLabel: String(slide.ctaLabel ?? slide.cta ?? ""),
            ctaHref: String(slide.ctaHref ?? slide.link ?? slide.href ?? "/"),
            imageUrl: String(slide.imageUrl ?? slide.image ?? ""),
          };
        })
        .filter((slide) => Boolean(slide.title || slide.subtitle || slide.ctaLabel || slide.imageUrl))
    : [];
  const slides = slidesFromConfig.length ? slidesFromConfig : siteConfig.homepage.heroCarousel.slides;
  const autoplayMs = Number(section.config.autoplayMs || siteConfig.homepage.heroCarousel.autoplayMs);
  const sideCardsFromConfig = Array.isArray(section.config.sideCards)
    ? section.config.sideCards.map((item) => {
        const card = (item ?? {}) as Record<string, unknown>;
        return {
          productId: String(card.productId ?? ""),
          title: String(card.title ?? ""),
          subtitle: String(card.subtitle ?? ""),
          ctaLabel: String(card.ctaLabel ?? "Shop now"),
          ctaHref: String(card.ctaHref ?? card.link ?? card.href ?? "/"),
          imageUrl: String(card.imageUrl ?? card.image ?? ""),
        };
      })
    : [];
  const sideCardProductIds = Array.from(
    new Set(
      sideCardsFromConfig
        .map((card) => card.productId)
        .filter(Boolean)
    )
  );
  const selectedProductsResult = sideCardProductIds.length ? await getProductsByIdsOrMock(sideCardProductIds) : null;
  const selectedProducts = selectedProductsResult?.source === "db" ? selectedProductsResult.products : [];
  const productById = new Map(selectedProducts.map((product) => [product.id, product]));
  const resolvedSideCards = sideCardsFromConfig.length
    ? sideCardsFromConfig.map((card) => {
        const selectedProduct = card.productId ? productById.get(card.productId) : undefined;
        if (!selectedProduct) return card;
        return {
          title: selectedProduct.name,
          subtitle: selectedProduct.partNumber
            ? `${selectedProduct.partNumber} · ₹${selectedProduct.price}`
            : `₹${selectedProduct.price}`,
          ctaLabel: card.ctaLabel || "Shop now",
          ctaHref: `/products/${selectedProduct.slug}`,
          imageUrl: selectedProduct.image || card.imageUrl,
        };
      })
    : siteConfig.homepage.heroCarousel.sideCards;

  return (
    <div className="[&>section]:mt-0">
      <HeroBanner
        eyebrow={sectionEyebrow}
        slides={slides}
        sideCards={resolvedSideCards}
        autoplayMs={autoplayMs}
      />
    </div>
  );
}
