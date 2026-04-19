"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckoutStepper } from "@/components/store/checkout/CheckoutStepper";
import Image from "next/image";

type CartSummary = {
  cart?: { items: Array<{ product: string; quantity: number }> };
  totals?: {
    subtotal: number;
    shippingCharge: number;
    taxAmount?: number;
    taxPercent?: number;
    discountAmount?: number;
    total?: number;
    products?: Array<{ id: string; name: string; image: string; unitPrice: number }>;
  };
  error?: string;
};

export default function ShippingPage() {
  const router = useRouter();
  const [cartData, setCartData] = useState<CartSummary | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState("");
  const [removingProductId, setRemovingProductId] = useState("");
  const [form, setForm] = useState(() => {
    if (typeof window === "undefined") {
      return {
        name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      };
    }
    try {
      const local = window.localStorage.getItem("lk_shipping_address");
      if (local) {
        const parsed = JSON.parse(local) as Partial<{
          name: string;
          phone: string;
          line1: string;
          line2: string;
          city: string;
          state: string;
          pincode: string;
          country: string;
        }>;
        return {
          name: parsed.name ?? "",
          phone: parsed.phone ?? "",
          line1: parsed.line1 ?? "",
          line2: parsed.line2 ?? "",
          city: parsed.city ?? "",
          state: parsed.state ?? "",
          pincode: parsed.pincode ?? "",
          country: parsed.country ?? "India",
        };
      }
    } catch {
      // Ignore malformed localStorage value and fallback to defaults.
    }
    return {
      name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    };
  });

  useEffect(() => {
    if (form.line1 || form.pincode || form.phone) return;
    const loadDefaultAddress = async () => {
      const res = await fetch("/api/v1/account/default-address");
      if (!res.ok) return;
      const body = (await res.json().catch(() => ({}))) as { address?: Partial<typeof form> };
      if (!body.address) return;
      setForm((prev) => ({
        ...prev,
        name: body.address?.name ?? prev.name,
        phone: body.address?.phone ?? prev.phone,
        line1: body.address?.line1 ?? prev.line1,
        line2: body.address?.line2 ?? prev.line2,
        city: body.address?.city ?? prev.city,
        state: body.address?.state ?? prev.state,
        pincode: body.address?.pincode ?? prev.pincode,
        country: body.address?.country ?? prev.country,
      }));
    };
    loadDefaultAddress();
  }, [form.line1, form.pincode, form.phone]);

  useEffect(() => {
    const loadCart = async () => {
      setCartLoading(true);
      setCartError("");
      try {
        const res = await fetch("/api/v1/cart", { credentials: "include" });
        const json = (await res.json().catch(() => ({}))) as CartSummary;
        if (!res.ok) {
          setCartError(json.error || "Failed to load checkout items.");
          setCartData(null);
          return;
        }
        setCartData(json);
      } catch {
        setCartError("Failed to load checkout items.");
      } finally {
        setCartLoading(false);
      }
    };
    void loadCart();
  }, []);

  const removeItem = async (productId: string) => {
    setRemovingProductId(productId);
    setCartError("");
    try {
      const res = await fetch("/api/v1/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const json = (await res.json().catch(() => ({}))) as CartSummary;
      if (!res.ok) {
        setCartError(json.error || "Failed to remove item.");
        return;
      }
      setCartData(json);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated"));
    } finally {
      setRemovingProductId("");
    }
  };

  const onContinue = () => {
    localStorage.setItem("lk_shipping_address", JSON.stringify(form));
    router.push("/checkout/billing");
  };

  return (
    <main className="space-y-4">
      <CheckoutStepper active="Shipping" />
      <section className="rounded border border-zinc-200 bg-white p-4 md:p-6">
        <div className="border-b border-zinc-200 pb-3">
          <h2 className="text-xl font-bold text-zinc-900">Your Cart</h2>
          <p className="mt-1 text-sm text-zinc-500">Review selected products before confirming shipping details.</p>
        </div>
        {cartLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading cart items...</p>
        ) : cartError ? (
          <p className="mt-4 text-sm text-rose-600">{cartError}</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="py-2">Qty</th>
                    <th className="py-2">Product</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Tax</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {(cartData?.totals?.products ?? []).map((item) => {
                    const qty = cartData?.cart?.items?.find((cartItem) => cartItem.product === item.id)?.quantity ?? 0;
                    const taxPercent = (cartData?.totals?.taxPercent ?? 18) / 100;
                    const lineTax = item.unitPrice * qty * taxPercent;
                    const lineTotal = item.unitPrice * qty + lineTax;
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="inline-flex min-w-14 items-center justify-center rounded border border-zinc-200 bg-zinc-50 px-2 py-1">
                            {qty}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {item.image ? <Image src={item.image} alt={item.name} width={52} height={52} className="rounded object-cover" /> : null}
                            <span className="font-medium text-zinc-800">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 font-semibold text-zinc-700">Rs.{item.unitPrice}</td>
                        <td className="py-3 font-semibold text-zinc-700">Rs.{lineTax.toFixed(2)}</td>
                        <td className="py-3 font-bold text-zinc-900">Rs.{lineTotal.toFixed(2)}</td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={removingProductId === item.id}
                            className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                          >
                            {removingProductId === item.id ? "Removing..." : "Remove"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right text-sm text-zinc-700">
              <p>
                Subtotal: <span className="font-semibold">Rs.{cartData?.totals?.subtotal ?? 0}</span>
              </p>
              <p>
                Tax ({cartData?.totals?.taxPercent ?? 18}%): <span className="font-semibold">Rs.{cartData?.totals?.taxAmount ?? 0}</span>
              </p>
              <p>
                Delivery: <span className="font-semibold">Rs.{cartData?.totals?.shippingCharge ?? 0}</span>
              </p>
              <p>
                Grand Total: <span className="font-semibold">Rs.{cartData?.totals?.total ?? 0}</span>
              </p>
            </div>
          </>
        )}
      </section>
      <section className="rounded border border-zinc-200 bg-white p-4 md:p-6">
        <div className="border-b border-zinc-200 pb-3">
          <h1 className="text-2xl font-bold text-zinc-900">Shipping Address</h1>
          <p className="mt-1 text-sm text-zinc-500">Enter delivery details to continue checkout.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Full name</span>
            <input className="w-full rounded border border-zinc-300 px-3 py-2" placeholder="Full name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Phone number</span>
            <input className="w-full rounded border border-zinc-300 px-3 py-2" placeholder="Phone number" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Address line 1</span>
            <input className="w-full rounded border border-zinc-300 px-3 py-2" placeholder="House no, street, area" value={form.line1} onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Address line 2</span>
            <input className="w-full rounded border border-zinc-300 px-3 py-2" placeholder="Apartment, landmark (optional)" value={form.line2} onChange={(e) => setForm((p) => ({ ...p, line2: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">City</span>
            <input className="w-full rounded border border-zinc-300 px-3 py-2" placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">State</span>
            <input className="w-full rounded border border-zinc-300 px-3 py-2" placeholder="State" value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Pincode</span>
            <input className="w-full rounded border border-zinc-300 px-3 py-2" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Country</span>
            <input className="w-full rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-700" placeholder="Country" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/cart" className="text-sm font-medium text-brand-yellow hover:underline">
            Return to cart
          </Link>
          <button
            onClick={onContinue}
            className="inline-flex items-center justify-center rounded bg-[#f5c400] px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-[#ffd84d]"
          >
            Continue to Payment
          </button>
        </div>
      </section>
    </main>
  );
}

