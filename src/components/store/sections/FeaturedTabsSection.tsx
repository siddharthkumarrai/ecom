import { HomeTabbedProductShowcase } from "@/components/store/home/HomeTabbedProductShowcase";
import type { SectionRenderProps } from "@/components/store/sections/registry";
import { getProductsByIdsOrMock } from "@/lib/store/data";
import type { Product } from "@/lib/store/types";

type FeaturedTabConfig = {
  id: string;
  title: string;
  productIds: string[];
};

const DEFAULT_FEATURED_TABS: FeaturedTabConfig[] = [
  { id: "featured", title: "Featured", productIds: [] },
  { id: "onsale", title: "On Sale", productIds: [] },
  { id: "topRated", title: "Top Rated", productIds: [] },
];

function parseFeaturedTabsFromSection(raw: unknown): FeaturedTabConfig[] {
  const incoming = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, FeaturedTabConfig>();
  for (const item of incoming) {
    const tab = (item ?? {}) as Record<string, unknown>;
    const id = String(tab.id ?? "").trim();
    if (!id) continue;
    byId.set(id, {
      id,
      title: String(tab.title ?? ""),
      productIds: Array.isArray(tab.productIds)
        ? tab.productIds.map((productId) => String(productId).trim()).filter(Boolean)
        : [],
    });
  }

  return DEFAULT_FEATURED_TABS.map((tab) => {
    const existing = byId.get(tab.id);
    return {
      id: tab.id,
      title: existing?.title || tab.title,
      productIds: existing?.productIds ?? [],
    };
  });
}

export async function FeaturedTabsSection({ section, sectionData, siteConfig }: SectionRenderProps) {
  const hasTabsConfig = Array.isArray(section.config.tabs);
  const tabIds = Array.isArray(section.config.tabIds)
    ? section.config.tabIds.map((tabId) => String(tabId))
    : [];
  const tabsFromSection = parseFeaturedTabsFromSection(hasTabsConfig ? section.config.tabs : []);
  const fallbackTabs = Array.isArray(siteConfig.homepage.featuredTabs)
    ? siteConfig.homepage.featuredTabs.map((tab) => ({
        id: String(tab.id || ""),
        title: String(tab.title || ""),
        productIds: Array.isArray(tab.productIds) ? tab.productIds.map((productId) => String(productId)).filter(Boolean) : [],
      })).filter((tab) => Boolean(tab.id))
    : [];
  const normalizedTabs = hasTabsConfig
    ? tabsFromSection
    : (fallbackTabs.length ? fallbackTabs : tabsFromSection);
  const hasAnyConfiguredProducts = normalizedTabs.some((tab) => tab.productIds.length > 0);

  const selectedProductIds = Array.from(new Set(normalizedTabs.flatMap((tab) => tab.productIds).filter(Boolean)));
  const selectedProductsResult = selectedProductIds.length ? await getProductsByIdsOrMock(selectedProductIds) : null;
  const selectedProducts = selectedProductsResult?.source === "db" ? selectedProductsResult.products : [];
  const selectedProductById = new Map(selectedProducts.map((product) => [product.id, product]));
  const sectionDataTabById = new Map(sectionData.featuredTabs.map((tab) => [tab.id, tab]));

  const tabs = (tabIds.length
    ? normalizedTabs.filter((tab) => tabIds.includes(tab.id))
    : normalizedTabs
  ).map((tab) => {
    const chosenProducts = tab.productIds
      .map((productId) => selectedProductById.get(productId))
      .filter((product): product is Product => Boolean(product));
    const fallbackProducts = hasAnyConfiguredProducts ? [] : (sectionDataTabById.get(tab.id)?.products ?? []);
    return {
      id: tab.id,
      title: tab.title,
      products: chosenProducts.length ? chosenProducts : fallbackProducts,
    };
  });

  return <HomeTabbedProductShowcase tabs={tabs} />;
}
