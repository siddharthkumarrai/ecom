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
    appliedCouponCode?: string;
    total?: number;
    products?: Array<{ id: string; name: string; image: string; unitPrice: number }>;
  };
  error?: string;
};

export function CartClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<CartApiResponse | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [removingProductId, setRemovingProductId] = useState("");

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
          setData(json);
          if (appliedCoupon.trim()) {
            if (json.totals?.appliedCouponCode) setCouponMessage(`Coupon applied: ${json.totals.appliedCouponCode}`);
            else setCouponMessage("Coupon invalid or not eligible.");
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

  const removeItem = async (productId: string) => {
    setRemovingProductId(productId);
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
    if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated"));
  };

  return (
    <>
      <div className="mt-4 rounded border border-zinc-200 bg-white p-4">
        <div className="overflow-x-auto">
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
              {(data?.totals?.products ?? []).map((product) => {
                const qty = quantityById.get(product.id) ?? 0;
                return (
                  <tr key={product.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="inline-flex min-w-16 items-center justify-center rounded border border-zinc-200 bg-zinc-50 px-3 py-1">
                        {qty}
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
                        disabled={removingProductId === product.id}
                        className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                      >
                        {removingProductId === product.id ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/category/all" className="text-sm font-medium text-brand-yellow hover:underline">
            Return to shop
          </Link>
          <div className="text-right text-sm">
            <p>Subtotal: <span className="font-semibold">Rs.{data?.totals?.subtotal ?? 0}</span></p>
            <p>Discount: <span className="font-semibold">Rs.{data?.totals?.discountAmount ?? 0}</span></p>
            <p>Shipping: <span className="font-semibold">Rs.{data?.totals?.shippingCharge ?? 0}</span></p>
            <p className="text-base font-bold">Total: Rs.{data?.totals?.total ?? (data?.totals?.subtotal ?? 0) + (data?.totals?.shippingCharge ?? 0)}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="h-9 rounded border border-zinc-300 px-3 text-sm"
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          />
          <button className="h-9 rounded bg-zinc-900 px-4 text-xs font-semibold text-white" onClick={() => setAppliedCoupon(couponCode.trim())}>
            Apply Coupon
          </button>
          {couponMessage ? <p className="text-xs text-zinc-600">{couponMessage}</p> : null}
        </div>
      </div>
      <Link href="/checkout/shipping" className="mt-6 inline-flex rounded bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-[#ffd84d]">
        Continue to Shipping
      </Link>
    </>
  );
}

