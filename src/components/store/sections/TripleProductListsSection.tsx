import Image from "next/image";
import Link from "next/link";
import { ProductMiniCard } from "@/components/store/sections/blocks/ProductMiniCard";
import { NoProductsMessage } from "@/components/store/sections/blocks/NoProductsMessage";
import { SectionHeader } from "@/components/store/sections/blocks/SectionHeader";
import type { SectionRenderProps } from "@/components/store/sections/registry";
import { getProductsByIdsOrMock } from "@/lib/store/data";

const FIXED_TRIPLE_TABS = [
  { id: "featured", title: "Featured" },
  { id: "onsale", title: "On Sale" },
  { id: "topRated", title: "Top Rated" },
] as const;

type TripleTab = { id: string; title: string; productIds: string[] };

function uniqueProductIds(ids: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of ids) {
    const value = id.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

function uniqueProductsById<T extends { id: string }>(products: T[]) {
  const seen = new Set<string>();
  const ordered: T[] = [];
  for (const product of products) {
    const value = String(product.id || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    ordered.push(product);
  }
  return ordered;
}

function parseTripleTabs(raw: unknown): TripleTab[] {
  const incoming = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, TripleTab>();
  for (const item of incoming) {
    const tab = (item ?? {}) as Record<string, unknown>;
    const id = String(tab.id || "").trim();
    if (!id) continue;
    byId.set(id, {
      id,
      title: String(tab.title || "").trim(),
      productIds: Array.isArray(tab.productIds)
        ? uniqueProductIds(tab.productIds.map((productId) => String(productId))).slice(0, 3)
        : [],
    });
  }

  return FIXED_TRIPLE_TABS.map((tab) => {
    const existing = byId.get(tab.id);
    return {
      id: tab.id,
      title: existing?.title || tab.title,
      productIds: existing?.productIds ?? [],
    };
  });
}

export async function TripleProductListsSection({ section, sectionData }: SectionRenderProps) {
  const tabIds = Array.isArray(section.config.tabIds)
    ? section.config.tabIds.map((tabId) => String(tabId))
    : [];
  const fallbackTabs = (tabIds.length
    ? sectionData.featuredTabs.filter((tab) => tabIds.includes(tab.id))
    : sectionData.featuredTabs
  ).slice(0, 3);
  const configuredTabs = parseTripleTabs(section.config.tripleTabs);
  const hasConfiguredProducts = configuredTabs.some((tab) => tab.productIds.length > 0);
  const fallbackById = new Map(fallbackTabs.map((tab) => [tab.id, tab]));
  const tabs = hasConfiguredProducts
    ? await Promise.all(
        configuredTabs.map(async (tab) => {
          const configuredProductsResult = tab.productIds.length ? await getProductsByIdsOrMock(tab.productIds) : null;
          const configuredProducts = configuredProductsResult?.source === "db"
            ? uniqueProductsById(configuredProductsResult.products).slice(0, 3)
            : [];
          const fallbackProducts = uniqueProductsById(fallbackById.get(tab.id)?.products ?? []).slice(0, 3);
          return {
            id: tab.id,
            title: tab.title,
            products: configuredProducts.length ? configuredProducts : fallbackProducts,
          };
        })
      )
    : fallbackTabs;
  const nonEmptyTabs = tabs.filter((tab) => tab.products.length > 0);
  const sideBannerImageUrl = String(section.config.sideBannerImageUrl || "/hero-placeholder.svg");
  const sideBannerHref = String(section.config.sideBannerHref || "/");

  if (!nonEmptyTabs.length) {
    return (
      <section className="rounded-md border border-zinc-200 bg-white p-3">
        <NoProductsMessage className="min-h-[260px]" />
      </section>
    );
  }

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-3 md:grid-cols-3">
        {nonEmptyTabs.map((tab) => (
          <div key={tab.id} className="rounded-md border border-zinc-200 bg-white p-3">
            <SectionHeader title={tab.title} />
            <div className="space-y-2">
              {tab.products.slice(0, 3).map((product, productIndex) => (
                <ProductMiniCard key={`${tab.id}-${product.id}-${productIndex}`} product={product} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Link href={sideBannerHref} className="relative min-h-72 overflow-hidden rounded-md border border-zinc-200">
        <Image src={sideBannerImageUrl} alt="Smart modules banner" fill sizes="280px" className="object-cover" />
      </Link>
    </section>
  );
}
