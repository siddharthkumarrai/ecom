"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/store/types";
import type { CSSProperties } from "react";

export function ProductDetailClient({
  product,
  buttonBg = "#f5c400",
  buttonHoverBg = "#ffd84d",
}: {
  product: Product;
  buttonBg?: string;
  buttonHoverBg?: string;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [showOutOfStockModal, setShowOutOfStockModal] = useState((product.stock ?? 0) <= 0);
  const [successModal, setSuccessModal] = useState<null | "cart" | "buy">(null);

  const stock = product.stock ?? 0;
  const maxQty = Math.max(0, Math.min(9999, stock));
  const isOutOfStock = maxQty <= 0;
  const buttonStyle = { "--pdp-btn-bg": buttonBg, "--pdp-btn-hover-bg": buttonHoverBg } as CSSProperties;

  const updateQty = (next: number) => {
    if (isOutOfStock) return;
    setQty(Math.max(1, Math.min(maxQty, Math.floor(next || 1))));
  };

  const addToCart = async (buyNow = false) => {
    if (isOutOfStock) {
      setShowOutOfStockModal(true);
      return;
    }
    setStatus("");
    setBusy(true);
    const res = await fetch("/api/v1/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: qty, replaceCart: buyNow }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      if (buyNow && res.status === 401) {
        router.push("/sign-in");
        return;
      }
      setStatus(body.error || "Please login to add items to cart.");
      return;
    }
    if (buyNow) {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated"));
      setSuccessModal("buy");
      return;
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated"));
    setSuccessModal("cart");
  };

  return (
    <div className="mt-5 border-t border-zinc-200 pt-4">
      {showOutOfStockModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-2xl">
            <p className="text-4xl text-rose-500">oops..</p>
            <p className="mt-3 text-4xl font-semibold text-rose-500">This item is out of stock!</p>
            <button
              type="button"
              onClick={() => router.push("/category/all")}
              className="mt-6 rounded-full border border-brand-yellow px-5 py-2 text-sm font-semibold text-brand-yellow hover:bg-brand-yellow/10"
            >
              Back to shopping
            </button>
          </div>
        </div>
      ) : null}
      {successModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 text-center shadow-2xl">
            <p className="text-4xl">🛒</p>
            <p className="mt-2 text-4xl font-semibold text-teal-500">Item added to your cart!</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSuccessModal(null)}
                className="rounded bg-brand-yellow px-6 py-2 text-sm font-semibold text-zinc-900 hover:bg-[#ffd84d]"
              >
                Back to shopping
              </button>
              <button
                type="button"
                onClick={() => router.push(successModal === "buy" ? "/checkout/shipping" : "/cart")}
                className="rounded bg-brand-yellow px-6 py-2 text-sm font-semibold text-zinc-900 hover:bg-[#ffd84d]"
              >
                {successModal === "buy" ? "Proceed to Checkout" : "Proceed to Checkout"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-3 border-b border-zinc-200 pb-2 text-[13px] font-semibold text-zinc-700">
        <div>Min Qty</div>
        <div>Max Qty</div>
        <div>Unit price</div>
      </div>
      <div className="mt-2 grid grid-cols-3 items-center gap-3 border-b border-zinc-200 pb-3 text-sm text-zinc-700">
        <div>1</div>
        <div className={isOutOfStock ? "font-semibold text-rose-600" : ""}>{isOutOfStock ? "0 (out of stock)" : product.stock}</div>
        <div className="font-semibold text-zinc-900">₹ {product.sellingPrice ?? product.price}</div>
      </div>
      <div className="mt-2 space-y-2">
        <p className="text-[13px] font-medium text-zinc-600">Quantity</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => updateQty(qty - 1)} className="h-6 w-6 rounded-sm border border-zinc-300 bg-brand-yellow text-sm font-semibold disabled:opacity-60" disabled={isOutOfStock}>
            -
          </button>
          <input
            value={qty}
            onChange={(e) => updateQty(Number(e.target.value))}
            className="w-20 rounded-sm border border-zinc-300 px-2 py-1 text-center text-sm"
            disabled={isOutOfStock}
          />
          <button type="button" onClick={() => updateQty(qty + 1)} className="h-6 w-6 rounded-sm border border-zinc-300 bg-brand-yellow text-sm font-semibold disabled:opacity-60" disabled={isOutOfStock}>
            +
          </button>
          <span className="text-xs text-zinc-500">({isOutOfStock ? "0" : `${product.stock}`} available)</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <button
          disabled={busy || isOutOfStock}
          onClick={() => addToCart(false)}
          style={buttonStyle}
          className="rounded-sm bg-[var(--pdp-btn-bg)] px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-[var(--pdp-btn-hover-bg)] disabled:opacity-60"
        >
          Add to cart
        </button>
        <button
          disabled={busy || isOutOfStock}
          onClick={() => addToCart(true)}
          style={buttonStyle}
          className="rounded-sm bg-[var(--pdp-btn-bg)] px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-[var(--pdp-btn-hover-bg)] disabled:opacity-60"
        >
          Buy Now
        </button>
      </div>
      {status ? <p className="mt-2 text-xs text-zinc-600">{status}</p> : null}
    </div>
  );
}
