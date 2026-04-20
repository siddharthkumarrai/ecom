"use client";

import { useState } from "react";
import { HomeProductTile } from "@/components/store/home/HomeProductTile";
import type { Product } from "@/lib/store/types";

type ProductTab = {
  id: string;
  title: string;
  products: Product[];
};

export function HomeTabbedProductShowcase({ tabs }: { tabs: ProductTab[] }) {
  const usableTabs = tabs.filter((tab) => tab.products.length > 0);
  const [activeTabId, setActiveTabId] = useState(usableTabs[0]?.id ?? "");
  const activeTab = usableTabs.find((tab) => tab.id === activeTabId) ?? usableTabs[0];

  if (!activeTab) return null;

  return (
    <section className="border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-center gap-6 border-b border-zinc-200 px-3 pt-3 text-[14px] font-medium text-zinc-500 md:px-4">
        {usableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
            className={`border-b-2 pb-2.5 transition ${
              activeTab.id === tab.id ? "border-brand-yellow text-zinc-900" : "border-transparent hover:text-zinc-700"
            }`}
          >
            {tab.title}
          </button>
        ))}
      </div>

      <div className="flex items-stretch snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {activeTab.products.map((product) => (
          <div key={product.id} className="min-w-[48%] shrink-0 snap-start self-stretch md:min-w-[25%] lg:min-w-[14.2857%]">
            <HomeProductTile product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
