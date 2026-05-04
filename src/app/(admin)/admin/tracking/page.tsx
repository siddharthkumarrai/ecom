"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { isMockAWB } from "@/lib/providers/shipping/awb";

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

const OVERRIDE_STATUSES = ["pending", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"] as const;

export default function AdminTrackingPage() {
  const searchParams = useSearchParams();
  const highlightedOrderId = searchParams.get("orderId") || "";

  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [manageItem, setManageItem] = useState<ShipmentItem | null>(null);
  const [manageTab, setManageTab] = useState<"status" | "events" | "shipment">("status");
  const [manualAwb, setManualAwb] = useState("");
  const [manualCourier, setManualCourier] = useState("");
  const [manualTrackingUrl, setManualTrackingUrl] = useState("");
  const [manualStatus, setManualStatus] = useState<(typeof OVERRIDE_STATUSES)[number]>("pending");
  const [eventStatus, setEventStatus] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const load = async () => {
    const res = await fetch("/api/v1/admin/shipments", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as { items?: ShipmentItem[] };
    setItems(Array.isArray(body.items) ? body.items : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateItemInState = (updated: ShipmentItem | null) => {
    if (!updated) return;
    setItems((prev) => prev.map((item) => (item.orderId === updated.orderId ? { ...item, ...updated } : item)));
    setManageItem((prev) => (prev?.orderId === updated.orderId ? { ...prev, ...updated } : prev));
  };

  const openManage = (item: ShipmentItem) => {
    setManageItem(item);
    setManualAwb(item.awbCode || "");
    setManualCourier(item.courierName || "");
    setManualTrackingUrl(item.trackingUrl || "");
    setManualStatus(toOverrideStatus(item.deliveryStatus));
    setEventStatus("");
    setEventDescription("");
    setEventLocation("");
    setManageTab("status");
  };

  const handleConfirm = async (item: ShipmentItem) => {
    setError("");
    setBusyKey(`${item.orderId}-confirm`);
    const res = await fetch(`/api/v1/admin/orders/${item.orderId}/confirm`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; order?: ShipmentItem };
    if (!res.ok) {
      setError(body.error || "Failed to confirm order.");
      setBusyKey(null);
      return;
    }
    updateItemInState(body.order ?? null);
    toast.success(`✅ Order confirmed for ${item.orderId}`);
    setBusyKey(null);
  };

  const createShipment = async (item: ShipmentItem) => {
    setError("");
    setBusyKey(`${item.orderId}-create`);
    const res = await fetch("/api/v1/admin/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: item.orderId }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; item?: ShipmentItem };
    if (!res.ok) {
      setError(body.error || "Failed to create shipment.");
      setBusyKey(null);
      return;
    }
    updateItemInState(body.item ?? null);
    toast.success(`Shipment created for ${item.orderId}`);
    setBusyKey(null);
  };

  const syncTracking = async (item: ShipmentItem) => {
    setError("");
    setBusyKey(`${item.orderId}-sync`);
    const res = await fetch("/api/v1/admin/shipments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: item.orderId, mode: "sync" }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; item?: ShipmentItem };
    if (!res.ok) {
      setError(body.error || "Failed to sync tracking.");
      setBusyKey(null);
      return;
    }
    updateItemInState(body.item ?? null);
    toast.success(`Tracking synced for ${item.orderId}`);
    setBusyKey(null);
  };

  const saveManualStatus = async () => {
    if (!manageItem) return;
    setError("");
    setBusyKey(`${manageItem.orderId}-status`);
    const res = await fetch(`/api/v1/admin/orders/${manageItem.orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryStatus: manualStatus }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; order?: ShipmentItem };
    if (!res.ok) {
      setError(body.error || "Failed to update status.");
      setBusyKey(null);
      return;
    }
    updateItemInState(body.order ?? null);
    toast.success(`Status updated to: ${manualStatus.replaceAll("_", " ")}`);
    setBusyKey(null);
  };

  const addTrackingEvent = async () => {
    if (!manageItem) return;
    if (!eventStatus.trim() || !eventDescription.trim()) {
      setError("Status/title and description are required.");
      return;
    }
    setError("");
    setBusyKey(`${manageItem.orderId}-event`);
    const res = await fetch(`/api/v1/admin/orders/${manageItem.orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingEvent: {
          status: eventStatus.trim(),
          description: eventDescription.trim(),
          location: eventLocation.trim(),
        },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; order?: ShipmentItem };
    if (!res.ok) {
      setError(body.error || "Failed to add tracking event.");
      setBusyKey(null);
      return;
    }
    updateItemInState(body.order ?? null);
    setEventStatus("");
    setEventDescription("");
    setEventLocation("");
    toast.success("Tracking event added");
    setBusyKey(null);
  };

  const saveShipmentDetails = async () => {
    if (!manageItem) return;
    setError("");
    setBusyKey(`${manageItem.orderId}-shipment`);
    const res = await fetch("/api/v1/admin/shipments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: manageItem.orderId,
        mode: "manual",
        awbCode: manualAwb,
        courierName: manualCourier,
        trackingUrl: manualTrackingUrl,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; item?: ShipmentItem };
    if (!res.ok) {
      setError(body.error || "Failed to save shipment details.");
      setBusyKey(null);
      return;
    }
    updateItemInState(body.item ?? null);
    toast.success("Shipment details saved");
    setBusyKey(null);
  };

  const markDelivered = async (item: ShipmentItem) => {
    setError("");
    setBusyKey(`${item.orderId}-delivered`);
    const res = await fetch(`/api/v1/admin/orders/${item.orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryStatus: "delivered" }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; order?: ShipmentItem };
    if (!res.ok) {
      setError(body.error || "Failed to mark delivered.");
      setBusyKey(null);
      return;
    }
    updateItemInState(body.order ?? null);
    toast.success(`Status updated to: delivered`);
    setBusyKey(null);
  };

  const sortedManageEvents = useMemo(() => {
    if (!manageItem?.trackingEvents) return [];
    return [...manageItem.trackingEvents].sort((a, b) => toEpoch(b.eventTime) - toEpoch(a.eventTime));
  }, [manageItem]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Shipping Tracking</h1>
        <p className="mt-1 text-sm text-slate-500">Confirm paid orders, create shipments, sync tracking, and manage manual overrides.</p>
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
            {items.map((item) => {
              const paymentBadge = getPaymentBadge(item);
              const canConfirm = item.paymentStatus === "paid" && item.deliveryStatus === "pending";
              const awaitingPayment = item.deliveryStatus === "pending" && item.paymentStatus !== "paid";
              const canCreateShipment = item.deliveryStatus === "confirmed" && !item.shiprocketShipmentId;
              const hasShipment = !!item.shiprocketShipmentId || !!item.awbCode;
              const canSync = hasShipment && (item.deliveryStatus === "shipped" || item.deliveryStatus === "out_for_delivery" || item.deliveryStatus === "delivered");
              const canMarkDelivered = item.deliveryStatus === "shipped" || item.deliveryStatus === "out_for_delivery";
              const isRowHighlighted = highlightedOrderId === item.orderId;

              return (
                <tr key={item.orderId} className={`border-b last:border-0 ${isRowHighlighted ? "bg-amber-50/70" : ""}`}>
                  <td className="py-3 align-top">
                    <p className="font-semibold text-slate-800">{item.orderId}</p>
                    <p className="text-xs text-slate-500">₹ {item.totalAmount}</p>
                  </td>
                  <td className="py-3 align-top">
                    <p className="text-slate-700">{item.paymentMethod}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${paymentBadge.className}`}>{paymentBadge.label}</span>
                  </td>
                  <td className="py-3 align-top">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${deliveryBadgeClass(item.deliveryStatus)}`}>
                      {item.deliveryStatus.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 align-top">
                    <p className="text-slate-700">{item.shiprocketShipmentId || "-"}</p>
                    <p className="text-xs text-slate-500">{item.awbCode || "-"}</p>
                  </td>
                  <td className="py-3 align-top">
                    {item.awbCode && isMockAWB(item.awbCode) ? (
                      <span className="text-xs text-slate-500">Mock mode (internal tracking)</span>
                    ) : item.awbCode ? (
                      <a
                        href={item.trackingUrl || `https://shiprocket.co/tracking/${encodeURIComponent(item.awbCode)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Open Live Tracking
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                    <p className="text-xs text-slate-500">{item.courierName || ""}</p>
                    {item.trackingEvents?.[0]?.activity ? <p className="mt-1 text-xs text-slate-400">{item.trackingEvents[0].activity}</p> : null}
                  </td>
                  <td className="py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {awaitingPayment ? <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Awaiting Payment</span> : null}
                      {canConfirm ? (
                        <button
                          type="button"
                          disabled={busyKey === `${item.orderId}-confirm`}
                          onClick={() => void handleConfirm(item)}
                          className="rounded bg-[#f5c400] px-2 py-1 text-xs font-semibold text-zinc-900 hover:bg-[#ffd84d] disabled:opacity-60"
                        >
                          {busyKey === `${item.orderId}-confirm` ? "Confirming..." : "Confirm Order"}
                        </button>
                      ) : null}

                      {item.deliveryStatus === "pending" ? (
                        <button
                          type="button"
                          disabled
                          title="Confirm order first"
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-500 opacity-70"
                        >
                          Create Shipment
                        </button>
                      ) : null}

                      {canCreateShipment ? (
                        <button
                          type="button"
                          disabled={busyKey === `${item.orderId}-create`}
                          onClick={() => void createShipment(item)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {busyKey === `${item.orderId}-create` ? "Working..." : "Create Shipment"}
                        </button>
                      ) : null}

                      {canSync ? (
                        <button
                          type="button"
                          disabled={busyKey === `${item.orderId}-sync`}
                          onClick={() => void syncTracking(item)}
                          className="rounded border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                        >
                          {busyKey === `${item.orderId}-sync` ? "Refreshing..." : "Sync Tracking"}
                        </button>
                      ) : null}

                      {canMarkDelivered ? (
                        <button
                          type="button"
                          disabled={busyKey === `${item.orderId}-delivered`}
                          onClick={() => void markDelivered(item)}
                          className="rounded border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          {busyKey === `${item.orderId}-delivered` ? "Updating..." : "Mark Delivered"}
                        </button>
                      ) : null}

                      {!awaitingPayment ? (
                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={() => openManage(item)}
                          className="rounded border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                        >
                          Manage
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </div>

      {manageItem ? (
        <div className="fixed inset-0 z-30 flex bg-black/35">
          <button type="button" className="flex-1" onClick={() => setManageItem(null)} aria-label="Close manage panel" />
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Manage {manageItem.orderId}</h2>
                <p className="text-xs text-slate-500">Manual status override, tracking events, and shipment details</p>
              </div>
              <button type="button" onClick={() => setManageItem(null)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                Close
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setManageTab("status")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${manageTab === "status" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"}`}
              >
                Update Delivery Status
              </button>
              <button
                type="button"
                onClick={() => setManageTab("events")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${manageTab === "events" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"}`}
              >
                Add Tracking Event
              </button>
              <button
                type="button"
                onClick={() => setManageTab("shipment")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${manageTab === "shipment" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"}`}
              >
                Shipment Details
              </button>
            </div>

            {manageTab === "status" ? (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Current status</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${deliveryBadgeClass(manageItem.deliveryStatus)}`}>
                  {manageItem.deliveryStatus.replaceAll("_", " ")}
                </span>
                <select value={manualStatus} onChange={(e) => setManualStatus(e.target.value as (typeof OVERRIDE_STATUSES)[number])} className="w-full rounded border border-slate-300 px-2 py-2 text-sm">
                  {OVERRIDE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busyKey === `${manageItem.orderId}-status`}
                  onClick={() => void saveManualStatus()}
                  className="rounded bg-[#f5c400] px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-[#ffd84d] disabled:opacity-60"
                >
                  {busyKey === `${manageItem.orderId}-status` ? "Saving..." : "Save Status"}
                </button>
              </div>
            ) : null}

            {manageTab === "events" ? (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <input
                  value={eventStatus}
                  onChange={(e) => setEventStatus(e.target.value)}
                  placeholder="Status / Title (e.g., Out for Delivery)"
                  className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                />
                <input
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Description"
                  className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                />
                <input
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Location (optional)"
                  className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={busyKey === `${manageItem.orderId}-event`}
                  onClick={() => void addTrackingEvent()}
                  className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {busyKey === `${manageItem.orderId}-event` ? "Adding..." : "Add Event"}
                </button>

                <div className="space-y-2">
                  {sortedManageEvents.length === 0 ? (
                    <p className="text-xs text-slate-500">No tracking events yet.</p>
                  ) : (
                    sortedManageEvents.map((event, idx) => (
                      <div key={`${event.status}-${event.eventTime}-${idx}`} className="rounded border border-slate-200 bg-white px-3 py-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-500">{formatDateTime(event.eventTime)}</span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{event.status || "Update"}</span>
                        </div>
                        <p className="mt-1 text-slate-700">{event.activity || "-"}</p>
                        {event.location ? <p className="text-slate-500">{event.location}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {manageTab === "shipment" ? (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <input value={manualAwb} onChange={(e) => setManualAwb(e.target.value)} placeholder="AWB code" className="w-full rounded border border-slate-300 px-2 py-2 text-sm" />
                <input
                  value={manualCourier}
                  onChange={(e) => setManualCourier(e.target.value)}
                  placeholder="Courier name"
                  className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                />
                <input
                  value={manualTrackingUrl}
                  onChange={(e) => setManualTrackingUrl(e.target.value)}
                  placeholder="Tracking URL"
                  className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={busyKey === `${manageItem.orderId}-shipment`}
                  onClick={() => void saveShipmentDetails()}
                  className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {busyKey === `${manageItem.orderId}-shipment` ? "Saving..." : "Save"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getPaymentBadge(item: ShipmentItem) {
  const normalized = item.paymentMethod === "cod" ? "cod" : String(item.paymentStatus || "pending").toLowerCase();
  if (normalized === "paid") return { label: "paid", className: "bg-emerald-100 text-emerald-700" };
  if (normalized === "pending") return { label: "pending", className: "bg-slate-100 text-slate-700" };
  if (normalized === "abandoned" || normalized === "failed" || normalized === "refunded" || normalized === "partial_refund") {
    return { label: normalized, className: "bg-rose-100 text-rose-700" };
  }
  if (normalized === "cod") return { label: "cod", className: "bg-blue-100 text-blue-700" };
  return { label: normalized, className: "bg-slate-100 text-slate-700" };
}

function deliveryBadgeClass(status: string) {
  const value = String(status || "pending").toLowerCase();
  if (value === "pending") return "bg-slate-100 text-slate-700";
  if (value === "confirmed") return "bg-blue-100 text-blue-700";
  if (value === "shipped" || value === "processing") return "bg-orange-100 text-orange-700";
  if (value === "out_for_delivery") return "bg-[#f5c400]/20 text-[#8a6d00]";
  if (value === "delivered") return "bg-emerald-100 text-emerald-700";
  if (value === "cancelled" || value === "returned") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function toEpoch(value?: string) {
  if (!value) return 0;
  const epoch = new Date(value).getTime();
  return Number.isFinite(epoch) ? epoch : 0;
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const epoch = new Date(value).getTime();
  if (!Number.isFinite(epoch)) return "--";
  return new Date(epoch).toLocaleString();
}

function toOverrideStatus(status: string) {
  if ((OVERRIDE_STATUSES as readonly string[]).includes(status)) {
    return status as (typeof OVERRIDE_STATUSES)[number];
  }
  return "pending";
}

