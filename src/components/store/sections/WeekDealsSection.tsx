import { CountdownTimer } from "@/components/store/sections/blocks/CountdownTimer";
import { NoProductsMessage } from "@/components/store/sections/blocks/NoProductsMessage";
import { HomeProductTile } from "@/components/store/home/HomeProductTile";
import type { SectionRenderProps } from "@/components/store/sections/registry";
import { getProductsByIdsOrMock } from "@/lib/store/data";
import type { Product } from "@/lib/store/types";

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values));
}

function dedupeProductsById(products: Product[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

export async function WeekDealsSection({ section, siteConfig, sectionData }: SectionRenderProps) {
  const title = String(section.config.title || siteConfig.homepage.weekDeals.title);
  const subtitle = String(section.config.subtitle || siteConfig.homepage.weekDeals.subtitle);
  const endsAt = String(section.config.endsAt || siteConfig.homepage.weekDeals.endsAt);
  const rawProductIds = Array.isArray(section.config.productIds)
    ? section.config.productIds.map((id) => String(id).trim()).filter(Boolean)
    : Array.isArray(siteConfig.homepage.weekDeals.productIds)
      ? siteConfig.homepage.weekDeals.productIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const productIds = dedupeStrings(rawProductIds);
  const selectedProductsResult = productIds.length ? await getProductsByIdsOrMock(productIds) : null;
  const selectedProducts = selectedProductsResult?.source === "db" ? selectedProductsResult.products : [];
  const selectedById = new Map(selectedProducts.map((product) => [product.id, product]));
  const configuredProducts = productIds
    .map((productId) => selectedById.get(productId))
    .filter((product): product is Product => Boolean(product));
  const fallbackProducts = dedupeProductsById(sectionData.weekDealsProducts);
  const products = dedupeProductsById(configuredProducts.length ? configuredProducts : fallbackProducts).slice(0, 20);
  if (!products.length) {
    return (
      <section className="grid min-w-0 gap-3 border border-zinc-200 bg-[#f5f5f5] p-2 sm:p-3 md:p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="bg-transparent p-1.5 sm:p-2">
          <p className="text-[22px] leading-7 font-medium text-zinc-800 sm:text-[28px] sm:leading-8 md:text-[34px] md:leading-[38px]">{title}</p>
          <div className="mt-2 text-5xl leading-none text-zinc-700 sm:mt-3 sm:text-6xl md:mt-4 md:text-7xl">%</div>
          <p className="mt-2 text-xs text-zinc-700 sm:mt-3 sm:text-sm">{subtitle}</p>
          <div className="mt-3">
            <CountdownTimer endsAt={endsAt} />
          </div>
        </aside>
        <div className="min-w-0 overflow-hidden border border-zinc-200 bg-white">
          <NoProductsMessage className="min-h-[220px]" />
        </div>
      </section>
    );
  }

  return (
    <section className="grid min-w-0 gap-3 border border-zinc-200 bg-[#f5f5f5] p-2 sm:p-3 md:p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="bg-transparent p-1.5 sm:p-2">
        <p className="text-[22px] leading-7 font-medium text-zinc-800 sm:text-[28px] sm:leading-8 md:text-[34px] md:leading-[38px]">{title}</p>
        <div className="mt-2 text-5xl leading-none text-zinc-700 sm:mt-3 sm:text-6xl md:mt-4 md:text-7xl">%</div>
        <p className="mt-2 text-xs text-zinc-700 sm:mt-3 sm:text-sm">{subtitle}</p>
        <div className="mt-3">
          <CountdownTimer endsAt={endsAt} />
        </div>
      </aside>
      <div className="min-w-0 overflow-hidden border border-zinc-200 bg-white">
        <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {products.map((product) => (
            <div key={product.id} className="min-w-[48%] shrink-0 snap-start sm:min-w-[40%] md:min-w-[32%] lg:min-w-[240px] xl:min-w-[220px]">
              <HomeProductTile product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
