import { notFound } from "next/navigation";
import { CategoryProductsCatalog } from "@/components/store/category/CategoryProductsCatalog";
import { StoreBottomSections } from "@/components/store/layout/StoreBottomSections";
import { getCategoryBySlugOrMock, getProductsByCategorySlugOrMock, getSiteConfigOrMock } from "@/lib/store/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [{ category }, { products: categoryProducts }, { config }] = await Promise.all([
    getCategoryBySlugOrMock(slug),
    getProductsByCategorySlugOrMock(slug, 200),
    getSiteConfigOrMock(),
  ]);
  if (!category) return notFound();

  return (
    <main className="space-y-4 pb-2">
      <CategoryProductsCatalog
        categoryName={category.name}
        categorySlug={category.slug}
        products={categoryProducts}
        actionButtonBg={config.appearance.productActionButtonBg}
        actionButtonHoverBg={config.appearance.productActionButtonHoverBg}
      />
      <StoreBottomSections />
    </main>
  );
}
