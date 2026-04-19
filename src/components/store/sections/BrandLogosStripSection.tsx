"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SectionRenderProps } from "@/components/store/sections/registry";

type BrandLogoItem = {
  label: string;
  href: string;
  grayLogoUrl: string;
  colorLogoUrl: string;
};

function toBrandHref(label: string) {
  const slug = label.toLowerCase().trim().replace(/\s+/g, "-");
  return slug ? `/brands/${slug}` : "/brands";
}

function toLabelFromHref(href: string) {
  const raw = href.trim();
  if (!raw) return "";
  const part = raw.split("/").filter(Boolean).pop() || "";
  if (!part) return "";
  return part
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBrandItems(section: SectionRenderProps["section"], siteConfig: SectionRenderProps["siteConfig"]): BrandLogoItem[] {
  const explicit = Array.isArray(section.config.brandItems)
    ? section.config.brandItems
      .map((item) => {
        const brand = item && typeof item === "object" ? item as Record<string, unknown> : {};
        const label = String(brand.label || "").trim();
        const hrefRaw = String(brand.href || "").trim();
        const grayLogoUrl = String(brand.grayLogoUrl || "").trim();
        const colorLogoUrl = String(brand.colorLogoUrl || "").trim();
        const hasAnyValue = Boolean(label || hrefRaw || grayLogoUrl || colorLogoUrl);
        if (!hasAnyValue) return null;
        const resolvedLabel = label || toLabelFromHref(hrefRaw) || "Brand";
        const href = hrefRaw || toBrandHref(resolvedLabel);
        return {
          label: resolvedLabel,
          href,
          grayLogoUrl,
          colorLogoUrl,
        };
      })
      .filter((item): item is BrandLogoItem => Boolean(item))
    : [];

  if (explicit.length) return explicit;

  const labels = Array.isArray(section.config.brands)
    ? (section.config.brands as unknown[]).map((brand) => String(brand).trim()).filter(Boolean)
    : siteConfig.homepage.brandStrip.map((brand) => String(brand).trim()).filter(Boolean);

  return labels.map((label) => ({
    label,
    href: toBrandHref(label),
    grayLogoUrl: "",
    colorLogoUrl: "",
  }));
}

export function BrandLogosStripSection({ section, siteConfig }: SectionRenderProps) {
  const items = useMemo(() => normalizeBrandItems(section, siteConfig), [section, siteConfig]);
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const node = railRef.current;
    if (!node) return;

    const syncScrollState = () => {
      const maxLeft = Math.max(0, node.scrollWidth - node.clientWidth);
      setCanScrollLeft(node.scrollLeft > 2);
      setCanScrollRight(node.scrollLeft < maxLeft - 2);
    };

    syncScrollState();
    node.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);

    return () => {
      node.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, [items.length]);

  const scrollByDirection = (direction: "left" | "right") => {
    const node = railRef.current;
    if (!node) return;
    const amount = Math.max(240, Math.trunc(node.clientWidth * 0.72));
    node.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!items.length) return null;

  return (
    <section className="border border-zinc-200 bg-white px-2 py-3 md:px-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous brands"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-200 text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => scrollByDirection("left")}
          disabled={!canScrollLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={railRef}
          className="flex flex-1 snap-x snap-mandatory items-center gap-4 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const hasGray = Boolean(item.grayLogoUrl);
            const hasColor = Boolean(item.colorLogoUrl);
            const singleSource = item.grayLogoUrl || item.colorLogoUrl;
            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className="group flex h-16 w-[190px] shrink-0 snap-start items-center justify-center rounded-sm border border-transparent px-2 transition hover:border-zinc-200"
              >
                {hasGray && hasColor ? (
                  <span className="relative h-12 w-full">
                    <Image
                      src={item.grayLogoUrl}
                      alt={item.label}
                      fill
                      sizes="190px"
                      className="object-contain transition-opacity duration-200 group-hover:opacity-0"
                    />
                    <Image
                      src={item.colorLogoUrl}
                      alt={`${item.label} color logo`}
                      fill
                      sizes="190px"
                      className="object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  </span>
                ) : singleSource ? (
                  <span className="relative h-12 w-full">
                    <Image
                      src={singleSource}
                      alt={item.label}
                      fill
                      sizes="190px"
                      className="object-contain grayscale transition duration-200 group-hover:grayscale-0"
                    />
                  </span>
                ) : (
                  <span className="line-clamp-1 text-center text-3xl font-semibold italic tracking-wide text-zinc-400 transition-colors duration-200 group-hover:text-zinc-700">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Next brands"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-200 text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => scrollByDirection("right")}
          disabled={!canScrollRight}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
