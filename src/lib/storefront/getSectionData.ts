import {
  getCategoriesBySlugsOrMock,
  getHomeProductsOrMock,
  getProductsByIdsOrMock,
  getTopCategoriesOrMock,
} from "@/lib/store/data";
import type { SiteConfig } from "@/lib/store/types";
import type { FeaturedTabData, SectionDataMap } from "@/lib/storefront/types";

export async function getSectionData(config: SiteConfig): Promise<SectionDataMap> {
  const { products: allHomeProducts } = await getHomeProductsOrMock(80);
  const onSaleProducts = allHomeProducts.filter(
    (product) => typeof product.costPrice === "number" && product.costPrice > product.price
  );
  const topRatedProducts = [...allHomeProducts]
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
    )
    .slice(0, 10);

  const featuredTabs = await Promise.all(
    (config.homepage.featuredTabs ?? []).map(async (tab): Promise<FeaturedTabData> => {
      const tabIds = Array.isArray(tab.productIds) ? tab.productIds : [];
      const cmsProducts = tabIds.length ? (await getProductsByIdsOrMock(tabIds)).products : [];
      const normalized = `${tab.id} ${tab.title}`.toLowerCase();
      const fallbackProducts = normalized.includes("sale")
        ? onSaleProducts.slice(0, 10)
        : normalized.includes("top")
          ? topRatedProducts
          : allHomeProducts.slice(0, 10);

      return {
        id: tab.id,
        title: tab.title,
        products: cmsProducts.length ? cmsProducts : fallbackProducts,
      };
    })
  );

  const weekDealsFromCms = await getProductsByIdsOrMock(config.homepage.weekDeals.productIds ?? []);
  const weekDealsProducts = weekDealsFromCms.products.length
    ? weekDealsFromCms.products
    : (onSaleProducts.length ? onSaleProducts : allHomeProducts).slice(0, 10);

  const topCategoriesFromCms = await getCategoriesBySlugsOrMock(config.homepage.topCategories.categorySlugs ?? []);
  const fallbackTopCategories = await getTopCategoriesOrMock();
  const topCategories = topCategoriesFromCms.categories.length
    ? topCategoriesFromCms.categories
    : fallbackTopCategories.categories.slice(0, 10);

  return {
    featuredTabs,
    weekDealsProducts,
    topCategories,
    allHomeProducts,
  };
}
