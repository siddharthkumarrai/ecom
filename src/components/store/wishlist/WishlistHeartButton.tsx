"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function WishlistHeartButton({
  productId,
  initialInWishlist = false,
  className = "",
  variant = "icon",
}: {
  productId: string;
  initialInWishlist?: boolean;
  className?: string;
  variant?: "icon" | "inline";
}) {
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const loadState = async () => {
      const res = await fetch(`/api/v1/wishlist?productId=${encodeURIComponent(productId)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as { inWishlist?: boolean };
      setInWishlist(Boolean(data.inWishlist));
    };
    void loadState();
  }, [productId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const method = inWishlist ? "DELETE" : "POST";
    const res = await fetch("/api/v1/wishlist", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const data = (await res.json().catch(() => ({}))) as { inWishlist?: boolean };
    setBusy(false);

    if (res.status === 401) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    if (!res.ok) return;

    setInWishlist(Boolean(data.inWishlist));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wishlist-updated"));
    }
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 text-[13px] transition ${
          inWishlist ? "text-rose-600" : "text-zinc-500 hover:text-rose-600"
        } ${className}`}
      >
        <Heart size={15} fill={inWishlist ? "currentColor" : "none"} />
        <span>{inWishlist ? "Wishlisted" : "Wishlist"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      onClick={toggle}
      disabled={busy}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
        inWishlist ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-zinc-200 bg-white text-zinc-500 hover:text-emerald-600"
      } ${className}`}
    >
      <Heart size={16} fill={inWishlist ? "currentColor" : "none"} />
    </button>
  );
}
