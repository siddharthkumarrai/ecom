import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/store/types";
import { HomeProductTile } from "@/components/store/home/HomeProductTile";

export function HomeCategorySection({
  title,
  categorySlug,
  products,
  promoImageUrl,
  promoHref,
  promoAlt,
  anchorLinks,
  sidebarFilters,
}: {
  title: string;
  categorySlug?: string;
  products: Product[];
  promoImageUrl?: string;
  promoHref?: string;
  promoAlt?: string;
  anchorLinks?: Array<{ title?: string; href?: string }>;
  sidebarFilters?: string[];
}) {
  const promoHrefResolved = promoHref?.trim() || (categorySlug ? `/category/${categorySlug}` : "");
  const hasPromo = Boolean(promoImageUrl?.trim() && promoHrefResolved);
  const resolvedAnchorLinks = (anchorLinks ?? [])
    .map((item) => ({
      title: String(item.title || "").trim(),
      href: String(item.href || "").trim(),
    }))
    .filter((item) => item.title && item.href);
  const fallbackAnchorLinks = sidebarFilters?.length
    ? sidebarFilters
      .map((filter) => String(filter).trim())
      .filter(Boolean)
      .map((filter) => ({ title: filter, href: categorySlug ? `/category/${categorySlug}` : "#" }))
    : [];
  const finalAnchorLinks = resolvedAnchorLinks.length
    ? resolvedAnchorLinks
    : (fallbackAnchorLinks.length
      ? fallbackAnchorLinks
      : (categorySlug ? [{ title: `Browse ${title}`, href: `/category/${categorySlug}` }] : []));

  return (
    <section className="bg-white">
      <div className="flex items-center justify-between px-3 py-2 md:px-4">
        <h2 className="text-[28px] font-medium uppercase text-zinc-800">{title}</h2>
      </div>
      <div className="ml-3 h-[2px] w-20 bg-[#f5c400] md:ml-4" />
      <div className={`grid gap-2 p-3 md:p-4 ${hasPromo ? "lg:grid-cols-[180px_minmax(0,1fr)_270px]" : "lg:grid-cols-[180px_minmax(0,1fr)]"}`}>
        <aside className="hidden lg:block">
          <div className="divide-y divide-zinc-200 border border-zinc-200 bg-white">
            {finalAnchorLinks.map((item) => (
              <Link
                key={`${item.title}-${item.href}`}
                href={item.href}
                className="block w-full px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
              >
                {item.title}
              </Link>
            ))}
            {!finalAnchorLinks.length && categorySlug ? (
              <Link href={`/category/${categorySlug}`} className="block px-3 py-2 text-[12px] text-zinc-700 hover:bg-zinc-50">
                Browse {title}
              </Link>
            ) : null}
          </div>
        </aside>
        <div className="grid grid-cols-2 gap-2 border border-zinc-200 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <HomeProductTile key={product.id} product={product} />
          ))}
        </div>
        {hasPromo ? (
          <Link
            href={promoHrefResolved}
            className="group relative min-h-[170px] overflow-hidden border border-zinc-200 bg-[#f7f9fc] lg:min-h-full"
          >
            <Image
              src={promoImageUrl || "/hero-placeholder.svg"}
              alt={promoAlt || `${title} promo`}
              fill
              sizes="260px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
