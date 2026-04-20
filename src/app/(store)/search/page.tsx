import { SearchProductsCatalog } from "@/components/store/search/SearchProductsCatalog";
import { getSiteConfigOrMock, getTopCategoriesOrMock, searchStoreProductsFromDb } from "@/lib/store/data";

interface Props {
  searchParams?: Promise<{ q?: string; category?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = String(resolvedSearchParams.q ?? "").trim();
  const categorySlug = String(resolvedSearchParams.category ?? "all").trim().toLowerCase() || "all";

  const [searchResult, { categories }, { config }] = await Promise.all([
    searchStoreProductsFromDb({ query, categorySlug, limit: 120 }),
    getTopCategoriesOrMock(),
    getSiteConfigOrMock(),
  ]);
  const { products, dbError } = searchResult;

  const categoryName = categorySlug === "all"
    ? "All Categories"
    : categories.find((category) => category.slug === categorySlug)?.name ?? categorySlug.toUpperCase();

  return (
    <main className="pb-2">
      <SearchProductsCatalog
        query={query}
        categorySlug={categorySlug}
        categoryName={categoryName}
        products={products}
        dbError={dbError}
        actionButtonBg={config.appearance.productActionButtonBg}
        actionButtonHoverBg={config.appearance.productActionButtonHoverBg}
      />
    </main>
  );
}

