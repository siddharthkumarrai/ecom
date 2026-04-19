import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/store/home/ProductGrid";
import { getBrandBySlugOrMock, getProductsByBrandSlugOrMock } from "@/lib/store/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const [{ brand }, { products: brandProducts }] = await Promise.all([getBrandBySlugOrMock(slug), getProductsByBrandSlugOrMock(slug)]);
  if (!brand) return notFound();

  return (
    <main>
      <h1 className="text-3xl font-bold">{brand.name}</h1>
      <ProductGrid title={`${brand.name} Catalog`} products={brandProducts} />
    </main>
  );
}

