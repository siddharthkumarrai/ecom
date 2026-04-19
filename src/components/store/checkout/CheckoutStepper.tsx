const steps = ["Shipping", "Billing", "Delivery", "Payment", "Confirmation"];

export function CheckoutStepper({ active }: { active: string }) {
  return (
    <div className="mb-6 grid gap-2 border-b border-zinc-200 pb-4 sm:grid-cols-3 lg:grid-cols-6">
      {steps.map((step) => (
        <div
          key={step}
          className={`rounded border px-3 py-2 text-sm ${
            active === step ? "border-brand-yellow bg-brand-yellow/20 font-semibold text-zinc-900" : "border-zinc-200 text-zinc-600"
          }`}
        >
          {step}
        </div>
      ))}
    </div>
  );
}

