"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Product } from "@/lib/store/types";

interface SuperDealsMenuProps {
  products: Product[];
  label?: string;
}

function getDiscountPercent(product: Product) {
  if (typeof product.costPrice !== "number" || product.costPrice <= product.price) return 0;
  return Math.round(((product.costPrice - product.price) / product.costPrice) * 100);
}

export function SuperDealsMenu({ products, label = "Super Deals" }: SuperDealsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const superDealsData = useMemo(() => {
    const withDiscount = products
      .map((product) => ({ product, discount: getDiscountPercent(product) }))
      .filter((entry) => entry.discount > 0)
      .sort((a, b) => b.discount - a.discount);

    const hotDeals = withDiscount.slice(0, 6);
    const topRated = [...products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 6);
    const lowStock = [...products]
      .filter((product) => product.stock > 0 && product.stock <= 10)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);

    return { hotDeals, topRated, lowStock };
  }, [products]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-zinc-700 hover:text-black"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {label} <ChevronDown size={14} />
      </button>

      <div
        className={`absolute left-0 top-full z-30 mt-2 w-[min(94vw,920px)] rounded-md border border-zinc-300 bg-white p-4 shadow-xl transition-all duration-200 ${
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0"
        }`}
        role="dialog"
        aria-label="Super deals menu"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-rose-600">Hot Discounts</h3>
            <div className="mt-2 space-y-2">
              {superDealsData.hotDeals.length ? (
                superDealsData.hotDeals.map(({ product, discount }) => (
                  <Link key={`hot-${product.id}`} href={`/products/${product.slug}`} onClick={() => setOpen(false)} className="block rounded border border-zinc-200 p-2 hover:border-zinc-300">
                    <p className="line-clamp-1 text-sm font-medium text-zinc-800">{product.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      ₹ {product.sellingPrice ?? product.price} <span className="font-semibold text-emerald-600">({discount}% off)</span>
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-zinc-500">No discounted products currently.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-600">Top Rated</h3>
            <div className="mt-2 space-y-2">
              {superDealsData.topRated.length ? (
                superDealsData.topRated.map((product) => (
                  <Link key={`top-${product.id}`} href={`/products/${product.slug}`} onClick={() => setOpen(false)} className="block rounded border border-zinc-200 p-2 hover:border-zinc-300">
                    <p className="line-clamp-1 text-sm font-medium text-zinc-800">{product.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Rating: <span className="font-semibold text-zinc-700">{(product.rating ?? 0).toFixed(1)}</span>
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-zinc-500">No rated products currently.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-600">Low Stock</h3>
            <div className="mt-2 space-y-2">
              {superDealsData.lowStock.length ? (
                superDealsData.lowStock.map((product) => (
                  <Link key={`low-${product.id}`} href={`/products/${product.slug}`} onClick={() => setOpen(false)} className="block rounded border border-zinc-200 p-2 hover:border-zinc-300">
                    <p className="line-clamp-1 text-sm font-medium text-zinc-800">{product.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Stock left: <span className="font-semibold text-rose-600">{product.stock}</span>
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-zinc-500">No low-stock alerts currently.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
