"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CompareToggleButton } from "@/components/store/compare/CompareToggleButton";
import { clearCompareProducts, emitCompareUpdated, getCompareProductIds } from "@/components/store/compare/compare-storage";
import { WishlistHeartButton } from "@/components/store/wishlist/WishlistHeartButton";
import type { Product } from "@/lib/store/types";

export function ComparePageClient() {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const compareKey = useMemo(() => compareIds.join(","), [compareIds]);

  useEffect(() => {
    const refresh = () => setCompareIds(getCompareProductIds());
    refresh();
    window.addEventListener("compare-updated", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("compare-updated", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (!compareIds.length) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/v1/compare?ids=${encodeURIComponent(compareIds.join(","))}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { items?: Product[] };
      if (!controller.signal.aborted) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [compareKey, compareIds]);

  const clearAll = () => {
    clearCompareProducts();
    emitCompareUpdated();
  };

  if (!compareIds.length) {
    return (
      <main className="rounded border border-zinc-200 bg-white p-4">
        <h1 className="text-[44px] font-semibold leading-none">Compare Products</h1>
        <div className="mt-4 rounded border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500">No products in compare list yet.</p>
          <Link href="/" className="mt-4 inline-flex rounded bg-brand-yellow px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-[#ffd84d]">
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="rounded border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[44px] font-semibold leading-none">Compare Products</h1>
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Clear all
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(loading ? [] : items).map((item) => (
          <article key={item.id} className="rounded border border-zinc-200 p-3">
            <div className="relative h-40 w-full rounded bg-zinc-50">
              {item.image ? <Image src={item.image} alt={item.name} fill className="object-contain p-2" sizes="280px" /> : null}
            </div>
            <Link href={`/products/${item.slug}`} className="mt-2 block line-clamp-2 text-sm font-semibold text-[#1e63b8] hover:underline">
              {item.name}
            </Link>
            <p className="mt-1 text-xs text-zinc-500">{item.partNumber}</p>
            <p className="mt-1 text-base font-semibold text-zinc-900">₹ {item.sellingPrice ?? item.price}</p>
            <div className="mt-2 flex items-center justify-between">
              <CompareToggleButton productId={item.id} variant="inline" />
              <WishlistHeartButton productId={item.id} variant="inline" />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
