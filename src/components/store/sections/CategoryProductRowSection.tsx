import { HomeCategorySection } from "@/components/store/home/HomeCategorySection";
import type { SectionRenderProps } from "@/components/store/sections/registry";
import { getProductsByCategorySlugOrMock } from "@/lib/store/data";

export async function CategoryProductRowSection({ section }: SectionRenderProps) {
  const categorySlug = String(section.config.categorySlug || "");
  if (!categorySlug) return null;
  const rawProductLimit = Number(section.config.productLimit);
  const productLimit = Number.isFinite(rawProductLimit) && rawProductLimit > 0
    ? Math.max(1, Math.min(500, Math.trunc(rawProductLimit)))
    : 0;
  const { products } = await getProductsByCategorySlugOrMock(
    categorySlug,
    productLimit
  );
  const linksFromArray = Array.isArray(section.config.anchorLinks)
    ? section.config.anchorLinks
      .map((item) => {
        const anchor = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          title: String(anchor.title || "").trim(),
          href: String(anchor.href || "").trim(),
        };
      })
      .filter((item) => item.title && item.href)
    : [];
  const anchorTitle = String(section.config.anchorTitle || "").trim();
  const anchorHref = String(section.config.anchorHref || "").trim();
  const anchorLinks = (() => {
    const merged = [...linksFromArray];
    if (anchorTitle && anchorHref) {
      merged.unshift({ title: anchorTitle, href: anchorHref });
    }
    const seen = new Set<string>();
    return merged.filter((item) => {
      const key = `${item.title}|${item.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  if (!products.length) return null;

  return (
    <HomeCategorySection
      title={String(section.config.title || categorySlug)}
      categorySlug={categorySlug}
      products={products}
      promoImageUrl={String(section.config.promoImageUrl || "")}
      promoHref={String(section.config.promoHref || "")}
      promoAlt={String(section.config.promoAlt || "")}
      anchorLinks={anchorLinks}
      sidebarFilters={
        Array.isArray(section.config.sidebarFilters)
          ? section.config.sidebarFilters.map((item) => String(item))
          : undefined
      }
    />
  );
}
