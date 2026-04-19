"use client";

import { useEffect, useState } from "react";

type ShipmentItem = {
  orderId: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryStatus: string;
  shiprocketShipmentId?: string;
  awbCode?: string;
  trackingUrl?: string;
  courierName?: string;
  trackingEvents?: Array<{ status?: string; activity?: string; location?: string; eventTime?: string }>;
  createdAt: string;
};

export default function AdminTrackingPage() {
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [manualAwb, setManualAwb] = useState("");
  const [manualCourier, setManualCourier] = useState("");
  const [manualTrackingUrl, setManualTrackingUrl] = useState("");
  const [manualStatus, setManualStatus] = useState("pending");

  const load = async () => {
    const res = await fetch("/api/v1/admin/shipments");
    const body = (await res.json().catch(() => ({}))) as { items?: ShipmentItem[] };
    setItems(body.items ?? []);
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  const createShipment = async (orderId: string) => {
    setError("");
    setBusyOrderId(orderId);
    const res = await fetch("/api/v1/admin/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    if (!res.ok) {
      setError([body.error, typeof body.details === "string" ? body.details : ""].filter(Boolean).join(": ") || "Failed to create shipment.");
      setBusyOrderId(null);
      return;
    }
    await load();
    setBusyOrderId(null);
  };

  const refreshTracking = async (orderId: string) => {
    setError("");
    setBusyOrderId(orderId);
    const res = await fetch("/api/v1/admin/shipments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    if (!res.ok) {
      setError([body.error, typeof body.details === "string" ? body.details : ""].filter(Boolean).join(": ") || "Failed to refresh tracking.");
      setBusyOrderId(null);
      return;
    }
    await load();
    setBusyOrderId(null);
  };

  const beginManualEdit = (item: ShipmentItem) => {
    setEditingOrderId(item.orderId);
    setManualAwb(item.awbCode || "");
    setManualCourier(item.courierName || "");
    setManualTrackingUrl(item.trackingUrl || "");
    setManualStatus(item.deliveryStatus || "pending");
  };

  const saveManualUpdate = async (orderId: string) => {
    setError("");
    setBusyOrderId(orderId);
    const res = await fetch("/api/v1/admin/shipments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        mode: "manual",
        awbCode: manualAwb,
        courierName: manualCourier,
        trackingUrl: manualTrackingUrl,
        deliveryStatus: manualStatus,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    if (!res.ok) {
      setError([body.error, typeof body.details === "string" ? body.details : ""].filter(Boolean).join(": ") || "Failed to save shipment update.");
      setBusyOrderId(null);
      return;
    }
    setEditingOrderId(null);
    await load();
    setBusyOrderId(null);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Shipping Tracking</h1>
        <p className="mt-1 text-sm text-slate-500">Create Shiprocket shipments and refresh tracking status.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-3">Order</th>
              <th className="py-3">Payment</th>
              <th className="py-3">Delivery</th>
              <th className="py-3">Shipment</th>
              <th className="py-3">Tracking</th>
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.orderId} className="border-b last:border-0">
                <td className="py-3 align-top">
                  <p className="font-semibold text-slate-800">{item.orderId}</p>
                  <p className="text-xs text-slate-500">₹ {item.totalAmount}</p>
                </td>
                <td className="py-3 align-top">
                  <p className="text-slate-700">{item.paymentMethod}</p>
                  <p className="text-xs text-slate-500">{item.paymentStatus}</p>
                </td>
                <td className="py-3 align-top text-slate-700">{item.deliveryStatus}</td>
                <td className="py-3 align-top">
                  <p className="text-slate-700">{item.shiprocketShipmentId || "-"}</p>
                  <p className="text-xs text-slate-500">{item.awbCode || "-"}</p>
                </td>
                <td className="py-3 align-top">
                  {item.trackingUrl ? (
                    <a href={item.trackingUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      Open
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                  <p className="text-xs text-slate-500">{item.courierName || ""}</p>
                  {item.trackingEvents?.[0]?.activity ? <p className="mt-1 text-xs text-slate-400">{item.trackingEvents[0].activity}</p> : null}
                </td>
                <td className="py-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyOrderId === item.orderId || !!item.shiprocketShipmentId}
                      onClick={() => createShipment(item.orderId)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {item.shiprocketShipmentId ? "Created" : busyOrderId === item.orderId ? "Working..." : "Create Shipment"}
                    </button>
                    <button
                      type="button"
                      disabled={busyOrderId === item.orderId}
                      onClick={() => refreshTracking(item.orderId)}
                      className="rounded border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                    >
                      {busyOrderId === item.orderId ? "Refreshing..." : "Sync Tracking"}
                    </button>
                    <button
                      type="button"
                      disabled={busyOrderId === item.orderId}
                      onClick={() => beginManualEdit(item)}
                      className="rounded border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                    >
                      Manage
                    </button>
                  </div>
                  {editingOrderId === item.orderId ? (
                    <div className="mt-3 grid w-[270px] gap-2 rounded border border-slate-200 bg-slate-50 p-2">
                      <input
                        value={manualAwb}
                        onChange={(e) => setManualAwb(e.target.value)}
                        placeholder="AWB code"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        value={manualCourier}
                        onChange={(e) => setManualCourier(e.target.value)}
                        placeholder="Courier name"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        value={manualTrackingUrl}
                        onChange={(e) => setManualTrackingUrl(e.target.value)}
                        placeholder="Tracking URL"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <select value={manualStatus} onChange={(e) => setManualStatus(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-xs">
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="out_for_delivery">out_for_delivery</option>
                        <option value="delivered">delivered</option>
                        <option value="cancelled">cancelled</option>
                        <option value="returned">returned</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyOrderId === item.orderId}
                          onClick={() => saveManualUpdate(item.orderId)}
                          className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {busyOrderId === item.orderId ? "Saving..." : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditingOrderId(null)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </div>
    </section>
  );
}
