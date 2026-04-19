"use client";

import { GitCompareArrows } from "lucide-react";
import { useEffect, useState } from "react";
import { emitCompareUpdated, getMaxCompareItems, isProductInCompare, toggleCompareProduct } from "@/components/store/compare/compare-storage";

export function CompareToggleButton({
  productId,
  variant = "icon",
  className = "",
}: {
  productId: string;
  variant?: "icon" | "inline";
  className?: string;
}) {
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    const refresh = () => setInCompare(isProductInCompare(productId));
    refresh();
    window.addEventListener("compare-updated", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("compare-updated", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [productId]);

  const toggle = () => {
    const next = toggleCompareProduct(productId);
    if (next.maxReached) {
      window.alert(`You can compare up to ${getMaxCompareItems()} products.`);
      return;
    }
    setInCompare(next.inCompare);
    emitCompareUpdated();
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        aria-label={inCompare ? "Remove from compare" : "Add to compare"}
        onClick={toggle}
        className={`inline-flex items-center gap-1.5 text-[13px] transition ${
          inCompare ? "text-blue-700" : "text-zinc-500 hover:text-blue-700"
        } ${className}`}
      >
        <GitCompareArrows size={15} />
        <span>{inCompare ? "Compared" : "Compare"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={inCompare ? "Remove from compare" : "Add to compare"}
      onClick={toggle}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
        inCompare ? "border-blue-200 bg-blue-50 text-blue-700" : "border-zinc-200 bg-white text-zinc-500 hover:text-blue-700"
      } ${className}`}
    >
      <GitCompareArrows size={16} />
    </button>
  );
}
