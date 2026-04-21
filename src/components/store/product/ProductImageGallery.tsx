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
  const hasThumbnails = normalized.length > 1;

  return (
    <div className="space-y-3">
      <div className="relative min-h-[300px] min-w-0 overflow-hidden bg-[#f2f2f2] sm:min-h-[340px] md:min-h-[420px] md:rounded-lg md:border md:border-zinc-200 md:bg-white">
        {active ? <Image src={active} alt={name} fill className="object-contain p-5 md:p-6" sizes="(max-width: 768px) 100vw, 420px" /> : null}
      </div>
      {hasThumbnails ? (
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {normalized.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Select image ${idx + 1}`}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded border bg-white md:h-16 md:w-16 ${
                idx === activeIndex ? "border-brand-yellow" : "border-zinc-200"
              }`}
            >
              <Image src={img} alt={`${name} view ${idx + 1}`} fill className="object-contain p-1" sizes="64px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
