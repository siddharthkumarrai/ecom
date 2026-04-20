import {
  getCategoriesBySlugsOrMock,
  getHomeProductsOrMock,
  getProductsByIdsOrMock,
  getTopCategoriesOrMock,
} from "@/lib/store/data";
import type { SiteConfig } from "@/lib/store/types";
import type { FeaturedTabData, SectionDataMap } from "@/lib/storefront/types";

export async function getSectionData(config: SiteConfig): Promise<SectionDataMap> {
  const homeProductsResult = await getHomeProductsOrMock(80);
  const allHomeProducts = homeProductsResult.source === "db" ? homeProductsResult.products : [];
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
      const cmsProductsResult = tabIds.length ? await getProductsByIdsOrMock(tabIds) : null;
      const cmsProducts = cmsProductsResult?.source === "db" ? cmsProductsResult.products : [];
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
  const weekDealsFromCmsProducts = weekDealsFromCms.source === "db" ? weekDealsFromCms.products : [];
  const weekDealsProducts = weekDealsFromCmsProducts.length
    ? weekDealsFromCmsProducts
    : (onSaleProducts.length ? onSaleProducts : allHomeProducts).slice(0, 10);

  const topCategoriesFromCms = await getCategoriesBySlugsOrMock(config.homepage.topCategories.categorySlugs ?? []);
  const fallbackTopCategories = await getTopCategoriesOrMock();
  const topCategoriesFromDb = topCategoriesFromCms.source === "db" ? topCategoriesFromCms.categories : [];
  const fallbackTopCategoriesFromDb = fallbackTopCategories.source === "db" ? fallbackTopCategories.categories : [];
  const topCategories = topCategoriesFromDb.length
    ? topCategoriesFromDb
    : fallbackTopCategoriesFromDb.slice(0, 10);

  return {
    featuredTabs,
    weekDealsProducts,
    topCategories,
    allHomeProducts,
  };
}
