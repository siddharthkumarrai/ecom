"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckoutStepper } from "@/components/store/checkout/CheckoutStepper";

type AddressForm = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

type CartSummary = {
  totals?: {
    subtotal?: number;
    taxAmount?: number;
    taxPercent?: number;
    shippingCharge?: number;
    discountAmount?: number;
    total?: number;
  };
};

const COUPON_STORAGE_KEY = "lk_coupon_code";

function emptyAddress(): AddressForm {
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

export default function BillingPage() {
  const router = useRouter();
  const [couponCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return (window.localStorage.getItem(COUPON_STORAGE_KEY) ?? "").trim().toUpperCase();
  });
  const [cartData, setCartData] = useState<CartSummary | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [sameAsShipping, setSameAsShipping] = useState(() => {
    if (typeof window === "undefined") return true;
    const billingRaw = localStorage.getItem("lk_billing_address");
    return !billingRaw;
  });
  const [form, setForm] = useState<AddressForm>(() => {
    if (typeof window === "undefined") return emptyAddress();
    const shippingRaw = localStorage.getItem("lk_shipping_address");
    const billingRaw = localStorage.getItem("lk_billing_address");
    const shipping = shippingRaw ? (JSON.parse(shippingRaw) as AddressForm) : null;
    const billing = billingRaw ? (JSON.parse(billingRaw) as AddressForm) : null;
    return billing || shipping || emptyAddress();
  });

  useEffect(() => {
    const loadCart = async () => {
      try {
        const couponQuery = couponCode ? `?couponCode=${encodeURIComponent(couponCode)}` : "";
        const res = await fetch(`/api/v1/cart${couponQuery}`, { credentials: "include" });
        const json = (await res.json().catch(() => ({}))) as CartSummary;
        if (res.ok) setCartData(json);
      } finally {
        setCartLoading(false);
      }
    };
    void loadCart();
  }, [couponCode]);

  const onContinue = () => {
    if (sameAsShipping) {
      localStorage.removeItem("lk_billing_address");
    } else {
      localStorage.setItem("lk_billing_address", JSON.stringify(form));
    }
    router.push("/checkout/payment");
  };

  return (
    <main className="space-y-4">
      <CheckoutStepper active="Billing" />
      <section className="rounded border border-zinc-200 bg-white p-4 md:p-6">
        <div className="border-b border-zinc-200 pb-3">
          <h2 className="text-xl font-bold text-zinc-900">Order Summary</h2>
          <p className="mt-1 text-sm text-zinc-500">Charges based on current cart and delivery settings.</p>
        </div>
        {cartLoading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading summary...</p>
        ) : (
          <div className="mt-3 space-y-1 text-sm text-zinc-700">
            <p>Subtotal: <span className="font-semibold">Rs.{cartData?.totals?.subtotal ?? 0}</span></p>
            <p>Discount: <span className="font-semibold text-emerald-700">-Rs.{cartData?.totals?.discountAmount ?? 0}</span></p>
            <p>Subtotal after discount: <span className="font-semibold">Rs.{Math.max(0, (cartData?.totals?.subtotal ?? 0) - (cartData?.totals?.discountAmount ?? 0))}</span></p>
            <p>Tax ({cartData?.totals?.taxPercent ?? 18}%): <span className="font-semibold">Rs.{cartData?.totals?.taxAmount ?? 0}</span></p>
            <p>Delivery: <span className="font-semibold">Rs.{cartData?.totals?.shippingCharge ?? 0}</span></p>
            <p className="pt-1 text-base text-zinc-900">Grand Total: <span className="font-bold">Rs.{cartData?.totals?.total ?? 0}</span></p>
          </div>
        )}
      </section>
      <section className="rounded border border-zinc-200 bg-white p-4 md:p-6">
        <div className="border-b border-zinc-200 pb-3">
          <h1 className="text-2xl font-bold text-zinc-900">Billing Address</h1>
          <p className="mt-1 text-sm text-zinc-500">Choose billing details for invoice and payment records.</p>
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={sameAsShipping}
            onChange={(e) => setSameAsShipping(e.target.checked)}
          />
          Same as shipping address
        </label>

        {!sameAsShipping ? (
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
        ) : (
          <p className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">Billing address will be same as shipping address.</p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/checkout/shipping" className="text-sm font-medium text-brand-yellow hover:underline">
            Return to shipping
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
