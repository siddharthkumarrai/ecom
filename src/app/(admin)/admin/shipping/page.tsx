"use client";

import { useEffect, useState } from "react";

export default function AdminShippingPage() {
  const [threshold, setThreshold] = useState("500");
  const [charge, setCharge] = useState("50");
  const [taxPercent, setTaxPercent] = useState("18");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/v1/cms");
        const data = (await res.json()) as {
          config?: { shipping?: { freeShippingThreshold?: number; defaultShippingCharge?: number; taxPercent?: number } };
        };
        const shipping = data.config?.shipping;
        if (shipping) {
          setThreshold(String(shipping.freeShippingThreshold ?? 500));
          setCharge(String(shipping.defaultShippingCharge ?? 50));
          setTaxPercent(String(shipping.taxPercent ?? 18));
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const save = async () => {
    setStatus("Saving...");
    const res = await fetch("/api/v1/cms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipping: {
          freeShippingThreshold: Number(threshold),
          defaultShippingCharge: Number(charge),
          taxPercent: Number(taxPercent),
        },
      }),
    });
    setStatus(res.ok ? "Saved" : "Failed");
  };

  return (
    <section className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Delivery Charge Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure global delivery charges. Product-wise delivery charge is managed from product create/edit forms.</p>
      </div>
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Free Shipping Threshold (Rs)</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="e.g. 500" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Default Delivery Charge (Rs)</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={charge} onChange={(e) => setCharge(e.target.value)} placeholder="e.g. 50" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Tax Percentage (%)</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} placeholder="e.g. 18" />
        </label>
        <div>
          <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Save Settings
          </button>
        </div>
      </div>
      {loading ? <p className="text-sm text-zinc-500">Loading current settings...</p> : null}
      {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
    </section>
  );
}

