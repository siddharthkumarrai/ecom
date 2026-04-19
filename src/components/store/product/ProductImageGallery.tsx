"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export function ProductImageGallery({ name, images }: { name: string; images: string[] }) {
  const normalized = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const img of images) {
      if (!img || seen.has(img)) continue;
      seen.add(img);
      out.push(img);
    }
    return out;
  }, [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = normalized[activeIndex] || normalized[0] || "";

  return (
    <div>
      <div className="relative min-h-[300px] overflow-hidden rounded border border-zinc-200 bg-white">
        {active ? <Image src={active} alt={name} fill className="object-contain p-4" sizes="(max-width: 768px) 100vw, 420px" /> : null}
      </div>
      {normalized.length > 1 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {normalized.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative h-16 w-16 overflow-hidden rounded border bg-white ${idx === activeIndex ? "border-brand-yellow" : "border-zinc-200"}`}
            >
              <Image src={img} alt={`${name} view ${idx + 1}`} fill className="object-contain p-1" sizes="64px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
