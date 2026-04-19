"use client";

import { useState } from "react";

export default function AdminPaymentsPage() {
  const [activeProvider, setActiveProvider] = useState("razorpay");
  const [status, setStatus] = useState("");

  const save = async () => {
    setStatus("Saving...");
    const res = await fetch("/api/v1/cms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment: {
          activeProvider,
        },
      }),
    });
    setStatus(res.ok ? "Saved" : "Failed");
  };

  return (
    <section className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Payment Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Choose which payment gateway is active at checkout.</p>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Active Payment Provider</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={activeProvider} onChange={(e) => setActiveProvider(e.target.value)}>
            <option value="razorpay">Razorpay</option>
            <option value="stripe">Stripe (future)</option>
            <option value="cashfree">Cashfree (future)</option>
          </select>
        </label>
        <div>
          <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Save Settings
          </button>
        </div>
      </div>
      {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
    </section>
  );
}

