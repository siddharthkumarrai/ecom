"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckoutStepper } from "@/components/store/checkout/CheckoutStepper";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

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

export default function PaymentPage() {
  const router = useRouter();
  const [couponCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return (window.localStorage.getItem(COUPON_STORAGE_KEY) ?? "").trim().toUpperCase();
  });
  const [cartData, setCartData] = useState<CartSummary | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [method, setMethod] = useState<"razorpay" | "cod">("razorpay");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const loadRazorpayScript = async () => {
    if (window.Razorpay) return true;
    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const placeOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const raw = localStorage.getItem("lk_shipping_address");
      const billingRaw = localStorage.getItem("lk_billing_address");
      const shippingAddress = raw ? (JSON.parse(raw) as Record<string, string>) : null;
      const billingAddress = billingRaw ? (JSON.parse(billingRaw) as Record<string, string>) : shippingAddress;
      if (!shippingAddress?.name || !shippingAddress?.line1 || !shippingAddress?.phone || !shippingAddress?.city || !shippingAddress?.pincode) {
        setError("Please complete shipping address first.");
        return;
      }

      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          shippingAddress,
          billingAddress,
          paymentMethod: method,
          couponCode: couponCode || undefined,
        }),
      });

      const payload = (await res.json()) as { error?: string; orderId?: string; payment?: { razorpayOrderId?: string } };
      if (!res.ok) {
        setError(payload.error ?? "Order failed");
        return;
      }

      if (method === "razorpay") {
        const ok = await loadRazorpayScript();
        if (!ok) {
          setError("Failed to load Razorpay");
          return;
        }

        const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const razorpayOrderId = payload.payment?.razorpayOrderId;
        if (!key || !razorpayOrderId || !payload.orderId) {
          setError("Payment session is incomplete");
          return;
        }

        if (!window.Razorpay) {
          setError("Razorpay is unavailable");
          return;
        }

        const razorpay = new window.Razorpay({
          key,
          currency: "INR",
          order_id: razorpayOrderId,
          name: "Lumenskart",
          description: "Order Payment",
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            const verifyRes = await fetch("/api/v1/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                appOrderId: payload.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            if (!verifyRes.ok) {
              setError("Payment verification failed");
              return;
            }
            router.push("/checkout/confirmation");
          },
          modal: {
            ondismiss: async () => {
              await fetch("/api/v1/orders/abandon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ orderId: payload.orderId }),
              }).catch(() => undefined);
            },
          },
          prefill: {
            name: shippingAddress.name,
            email: "",
            contact: shippingAddress.phone,
          },
          theme: { color: "#F5C400" },
        });

        razorpay?.open();
        return;
      }
      router.push("/checkout/confirmation");
    } catch {
      setError("Order failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-4">
      <CheckoutStepper active="Payment" />
      <section className="rounded border border-zinc-200 bg-white p-4 md:p-6">
        <div className="border-b border-zinc-200 pb-3">
          <h2 className="text-xl font-bold text-zinc-900">Order Summary</h2>
          <p className="mt-1 text-sm text-zinc-500">Review charges before confirming payment.</p>
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
          <h1 className="text-2xl font-bold text-zinc-900">Payment Options</h1>
          <p className="mt-1 text-sm text-zinc-500">Select your payment method and place order securely.</p>
        </div>
        <div className="mt-4 space-y-3 rounded border border-zinc-200 bg-zinc-50 p-3">
          <label className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2">
            <input type="radio" name="pay" checked={method === "razorpay"} onChange={() => setMethod("razorpay")} />
            <span className="text-sm font-medium text-zinc-800">Razorpay (UPI/Card/Netbanking)</span>
          </label>
          <label className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2">
            <input type="radio" name="pay" checked={method === "cod"} onChange={() => setMethod("cod")} />
            <span className="text-sm font-medium text-zinc-800">Cash on Delivery</span>
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/checkout/billing" className="text-sm font-medium text-brand-yellow hover:underline">
            Return to billing
          </Link>
          <button onClick={placeOrder} disabled={loading} className="inline-flex rounded bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-[#ffd84d] disabled:opacity-60">
            {loading ? "Placing..." : "Place Order"}
          </button>
        </div>
      </section>
    </main>
  );
}
