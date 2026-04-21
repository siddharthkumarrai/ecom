"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type CartApiResponse = {
  cart?: { items: Array<{ product: string; quantity: number }> };
  totals?: {
    subtotal: number;
    shippingCharge: number;
    discountAmount?: number;
    taxAmount?: number;
    taxPercent?: number;
    appliedCouponCode?: string;
    couponMessage?: string;
    total?: number;
    products?: Array<{ id: string; name: string; image: string; unitPrice: number }>;
  };
  error?: string;
};

const COUPON_STORAGE_KEY = "lk_coupon_code";

export function CartClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<CartApiResponse | null>(null);
  const [couponCode, setCouponCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return (window.localStorage.getItem(COUPON_STORAGE_KEY) ?? "").trim().toUpperCase();
  });
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    if (typeof window === "undefined") return "";
    return (window.localStorage.getItem(COUPON_STORAGE_KEY) ?? "").trim().toUpperCase();
  });
  const [couponMessage, setCouponMessage] = useState("");
  const [removingProductId, setRemovingProductId] = useState("");
  const [updatingProductId, setUpdatingProductId] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const couponQuery = appliedCoupon.trim() ? `?couponCode=${encodeURIComponent(appliedCoupon.trim())}` : "";
        const res = await fetch(`/api/v1/cart${couponQuery}`, { credentials: "include" });
        const json = (await res.json()) as CartApiResponse;
        if (!res.ok) {
          setError(json.error ?? "Failed to load cart");
          setData(null);
        } else {
          setError("");
          setData(json);
          if (typeof window !== "undefined") {
            const persisted = String(json.totals?.appliedCouponCode ?? "").trim().toUpperCase();
            if (persisted) window.localStorage.setItem(COUPON_STORAGE_KEY, persisted);
            else window.localStorage.removeItem(COUPON_STORAGE_KEY);
          }
          if (appliedCoupon.trim()) {
            setCouponMessage(
              json.totals?.couponMessage ||
                (json.totals?.appliedCouponCode ? `Coupon applied: ${json.totals.appliedCouponCode}` : "Coupon invalid or not eligible.")
            );
          } else {
            setCouponMessage("");
          }
        }
      } catch {
        setError("Failed to load cart");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [appliedCoupon]);

  if (loading) return <p className="text-zinc-500">Loading cart...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const count = data?.cart?.items?.length ?? 0;
  if (!count)
    return (
      <div className="mt-4 rounded border border-zinc-200 bg-white p-10 text-center">
        <p className="text-3xl font-semibold text-zinc-700">Your Cart is empty</p>
      </div>
    );

  const quantityById = new Map((data?.cart?.items ?? []).map((item) => [item.product, item.quantity]));
  const products = data?.totals?.products ?? [];
  const subtotal = data?.totals?.subtotal ?? 0;
  const discountAmount = data?.totals?.discountAmount ?? 0;
  const shippingCharge = data?.totals?.shippingCharge ?? 0;
  const taxAmount = data?.totals?.taxAmount ?? 0;
  const taxPercent = data?.totals?.taxPercent ?? 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const removeItem = async (productId: string) => {
    setRemovingProductId(productId);
    setError("");
    const res = await fetch("/api/v1/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, couponCode: appliedCoupon.trim() || undefined }),
    });
    const json = (await res.json().catch(() => ({}))) as CartApiResponse;
    setRemovingProductId("");
    if (!res.ok) {
      setError(json.error || "Failed to remove item");
      return;
    }
    setData(json);
    if (appliedCoupon.trim()) {
      setCouponMessage(
        json.totals?.couponMessage ||
          (json.totals?.appliedCouponCode ? `Coupon applied: ${json.totals.appliedCouponCode}` : "Coupon invalid or not eligible.")
      );
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated"));
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    setUpdatingProductId(productId);
    setError("");
    const res = await fetch("/api/v1/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        quantity: Math.max(1, Math.trunc(quantity || 1)),
        couponCode: appliedCoupon.trim() || undefined,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as CartApiResponse;
    setUpdatingProductId("");
    if (!res.ok) {
      setError(json.error || "Failed to update quantity");
      return;
    }
    setData(json);
    if (appliedCoupon.trim()) {
      setCouponMessage(
        json.totals?.couponMessage ||
          (json.totals?.appliedCouponCode ? `Coupon applied: ${json.totals.appliedCouponCode}` : "Coupon invalid or not eligible.")
      );
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated"));
  };

  return (
    <>
      <div className="mt-4 rounded border border-zinc-200 bg-white p-4">
        <div className="space-y-3 md:hidden">
          {products.map((product) => {
            const qty = quantityById.get(product.id) ?? 0;
            const rowBusy = removingProductId === product.id || updatingProductId === product.id;
            return (
              <div key={product.id} className="rounded border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {product.image ? <Image src={product.image} alt={product.name} width={48} height={48} className="h-12 w-12 rounded object-cover" /> : null}
                    <p className="line-clamp-2 text-sm font-semibold text-zinc-800">{product.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    disabled={rowBusy}
                    className="rounded-full bg-rose-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                  >
                    {removingProductId === product.id ? "..." : "Remove"}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-1 py-1">
                    <button
                      type="button"
                      disabled={rowBusy || qty <= 1}
                      onClick={() => updateQuantity(product.id, qty - 1)}
                      className="h-7 w-7 rounded border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="inline-flex min-w-8 items-center justify-center text-sm font-semibold text-zinc-800">{qty}</span>
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => updateQuantity(product.id, qty + 1)}
                      className="h-7 w-7 rounded border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right text-xs text-zinc-700">
                    <p>Price: Rs.{product.unitPrice}</p>
                    <p className="text-sm font-bold text-zinc-900">Total: Rs.{(product.unitPrice * qty).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2">Qty</th>
                <th className="py-2">Product</th>
                <th className="py-2">Price</th>
                <th className="py-2">Total</th>
                <th className="py-2">Remove</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const qty = quantityById.get(product.id) ?? 0;
                const rowBusy = removingProductId === product.id || updatingProductId === product.id;
                return (
                  <tr key={product.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-1 py-1">
                        <button
                          type="button"
                          disabled={rowBusy || qty <= 1}
                          onClick={() => updateQuantity(product.id, qty - 1)}
                          className="h-7 w-7 rounded border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="inline-flex min-w-8 items-center justify-center text-sm font-semibold text-zinc-800">{qty}</span>
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => updateQuantity(product.id, qty + 1)}
                          className="h-7 w-7 rounded border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {product.image ? <Image src={product.image} alt={product.name} width={48} height={48} className="h-12 w-12 rounded object-cover" /> : null}
                        <span className="font-medium text-zinc-800">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-zinc-700">Rs.{product.unitPrice}</td>
                    <td className="py-3 font-bold text-zinc-800">Rs.{(product.unitPrice * qty).toFixed(2)}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        disabled={rowBusy}
                        className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                      >
                        {removingProductId === product.id ? "Removing..." : updatingProductId === product.id ? "Updating..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/category/all" className="text-sm font-medium text-brand-yellow hover:underline">
            Return to shop
          </Link>
          <div className="text-sm sm:text-right">
            <p>Subtotal: <span className="font-semibold">Rs.{subtotal}</span></p>
            <p>Coupon Discount: <span className="font-semibold text-emerald-700">-Rs.{discountAmount}</span></p>
            <p>Subtotal after discount: <span className="font-semibold">Rs.{discountedSubtotal}</span></p>
            <p>Tax ({taxPercent}%): <span className="font-semibold">Rs.{taxAmount}</span></p>
            <p>Shipping: <span className="font-semibold">Rs.{shippingCharge}</span></p>
            <p className="text-base font-bold">Total: Rs.{data?.totals?.total ?? discountedSubtotal + taxAmount + shippingCharge}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="h-9 w-full rounded border border-zinc-300 px-3 text-sm sm:w-auto"
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          />
          <button
            className="h-9 rounded bg-zinc-900 px-4 text-xs font-semibold text-white sm:w-auto"
            onClick={() => {
              const normalized = couponCode.trim().toUpperCase();
              setAppliedCoupon(normalized);
              if (typeof window !== "undefined") {
                if (normalized) window.localStorage.setItem(COUPON_STORAGE_KEY, normalized);
                else window.localStorage.removeItem(COUPON_STORAGE_KEY);
              }
            }}
          >
            Apply Coupon
          </button>
          {couponMessage ? <p className="text-xs text-zinc-600">{couponMessage}</p> : null}
        </div>
      </div>
      <Link href="/checkout/shipping" className="mt-6 inline-flex w-full justify-center rounded bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-[#ffd84d] sm:w-auto">
        Continue to Shipping
      </Link>
    </>
  );
}
