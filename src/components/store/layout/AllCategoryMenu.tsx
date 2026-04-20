"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Category, Product } from "@/lib/store/types";

interface AllCategoryMenuProps {
  categories: Category[];
  products: Product[];
  label: string;
  viewAllBrandsLabel: string;
  viewAllCategoriesLabel: string;
  openOnClickOnly?: boolean;
}

export function AllCategoryMenu({ categories, products, label, viewAllBrandsLabel, viewAllCategoriesLabel, openOnClickOnly = false }: AllCategoryMenuProps) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const firstSlug = categories[0]?.slug ?? "";
  const [hoveredSlug, setHoveredSlug] = useState<string>(firstSlug);
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

  useEffect(() => {
    const updateDevice = () => setIsDesktop(window.innerWidth >= 1024);
    updateDevice();
    window.addEventListener("resize", updateDevice);
    return () => window.removeEventListener("resize", updateDevice);
  }, []);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const category of categories) {
      map.set(
        category.slug,
        products.filter((product) => product.categorySlug === category.slug).slice(0, 8)
      );
    }
    return map;
  }, [categories, products]);

  const activeSlug = hoveredSlug || firstSlug;
  const hoveredCategory = categories.find((c) => c.slug === activeSlug);
  const hoveredItems = itemsByCategory.get(activeSlug) ?? [];

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        if (isDesktop && !openOnClickOnly) setOpen(true);
      }}
      onMouseLeave={() => {
        if (isDesktop && !openOnClickOnly) setOpen(false);
      }}
    >
      <button
        onClick={() => {
          if (!isDesktop || openOnClickOnly) setOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-1 whitespace-nowrap font-semibold"
      >
        {label} <ChevronDown size={14} />
      </button>

      <div
        className={`absolute left-0 top-full z-30 mt-2 grid max-h-[70vh] w-[min(92vw,760px)] grid-cols-1 overflow-auto rounded-md border border-zinc-300 bg-white shadow-xl transition-all duration-200 md:grid-cols-[300px_1fr] ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0 pointer-events-none"
        }`}
      >
          <div className="border-r border-zinc-200 bg-zinc-50">
            <Link
              href="/brands"
              onClick={() => setOpen(false)}
              className="block border-b border-zinc-200 px-4 py-3 text-[16px] font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              {viewAllBrandsLabel}
            </Link>
            <Link
              href="/category/all"
              onClick={() => setOpen(false)}
              className="block border-b border-zinc-200 px-4 py-3 text-[16px] font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              {viewAllCategoriesLabel}
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                onMouseEnter={() => setHoveredSlug(category.slug)}
                onClick={() => {
                  if (!isDesktop) setOpen(false);
                }}
                className={`flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 text-[15px] ${
                  hoveredSlug === category.slug ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <span>{category.name}</span>
                <ChevronRight size={16} className="text-zinc-400" />
              </Link>
            ))}
          </div>

          <div className="bg-white p-4">
            <h3 className="text-lg font-semibold text-zinc-800">{hoveredCategory?.name ?? "Category"}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {hoveredItems.length ? (
                hoveredItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/products/${item.slug}`}
                    onClick={() => setOpen(false)}
                    className="rounded border border-zinc-200 p-3 text-sm hover:border-zinc-300"
                  >
                    <p className="line-clamp-2 font-medium text-zinc-800">{item.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.partNumber}</p>
                  </Link>
                ))
              ) : (
                <div className="col-span-2 text-sm text-zinc-500">
                  <p>No products available in this category right now.</p>
                  <p className="mt-1">Please check again later or explore.</p>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
