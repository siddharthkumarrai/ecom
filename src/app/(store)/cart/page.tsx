import { CartClient } from "@/components/store/cart/CartClient";

export default function CartPage() {
  return (
    <main className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {["My Cart", "Shipping", "Billing", "Delivery", "Payment", "Confirmation"].map((step, index) => (
          <div
            key={step}
            className={`rounded border px-3 py-3 text-sm ${index === 0 ? "border-brand-yellow bg-brand-yellow/20 font-semibold" : "border-zinc-200 bg-white text-zinc-600"}`}
          >
            {step}
          </div>
        ))}
      </div>
      <CartClient />
    </main>
  );
}

