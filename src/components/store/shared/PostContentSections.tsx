import { ProductGrid } from "@/components/store/home/ProductGrid";
import { getHomeProductsOrMock, getSiteConfigOrMock } from "@/lib/store/data";

export async function PostContentSections() {
  const [{ products }, { config }] = await Promise.all([getHomeProductsOrMock(24), getSiteConfigOrMock()]);

  return (
    <section className="mt-6">
      <div className="rounded border border-zinc-200 bg-white px-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4 text-zinc-400">
          {config.homepage.brandStrip.map((brand) => (
            <span key={brand} className="text-[40px] font-semibold italic leading-none opacity-50">
              {brand}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {config.sections.slice(0, 3).map((section) => (
          <ProductGrid key={section.id} title={section.title} products={products} />
        ))}
      </div>
    </section>
  );
}

