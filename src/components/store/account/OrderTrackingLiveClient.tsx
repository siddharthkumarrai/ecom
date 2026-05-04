"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isMockAWB } from "@/lib/providers/shipping/awb";

type TrackingEvent = { status?: string; activity?: string; location?: string; eventTime?: string | Date | null };
type Item = { name: string; image?: string };
type Address = { name?: string; line1?: string; city?: string; state?: string; pincode?: string; phone?: string };

export type OrderTrackingView = {
  orderId: string;
  createdAt?: string | Date;
  items: Item[];
  totalAmount: number;
  shippingAddress?: Address;
  deliveryStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  awbCode?: string;
  courierName?: string;
  trackingUrl?: string;
  trackingEvents?: TrackingEvent[];
};

type TimelineStep = {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  active: boolean;
  timestamp?: string;
};

const TIMELINE_STEPS = [
  { key: "placed", label: "Order Placed", description: "Your order was placed successfully." },
  { key: "confirmed", label: "Confirmed", description: "Your order is confirmed and being prepared." },
  { key: "picked", label: "Picked Up", description: "Courier pickup has been completed." },
  { key: "transit", label: "In Transit", description: "Your shipment is moving to your city." },
  { key: "out_for_delivery", label: "Out for Delivery", description: "Courier is out to deliver your package." },
  { key: "delivered", label: "Delivered", description: "Your shipment has been delivered." },
] as const;

export default function OrderTrackingLiveClient({ initial }: { initial: OrderTrackingView }) {
  const [order, setOrder] = useState<OrderTrackingView>(initial);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshMs, setRefreshMs] = useState<number>(20000);
  const [mounted, setMounted] = useState(false);
  const [relativeUpdatedText, setRelativeUpdatedText] = useState("--");
  const [showAllEvents, setShowAllEvents] = useState(false);

  const mockAwb = isMockAWB(order.awbCode);
  const isRealAwb = !!order.awbCode && !mockAwb;
  const trackingHref = isRealAwb ? order.trackingUrl || `https://shiprocket.co/tracking/${encodeURIComponent(order.awbCode || "")}` : "";
  const firstItem = order.items?.[0];

  const sortedEvents = useMemo(() => {
    return (order.trackingEvents ?? [])
      .map((event) => ({
        status: String(event.status || ""),
        activity: String(event.activity || event.status || "Shipment update"),
        location: String(event.location || ""),
        eventTime: toIsoTime(event.eventTime),
      }))
      .sort((a, b) => toEpoch(b.eventTime) - toEpoch(a.eventTime));
  }, [order.trackingEvents]);

  const timeline = useMemo(() => buildTimeline({ deliveryStatus: order.deliveryStatus, createdAt: order.createdAt, trackingEvents: order.trackingEvents ?? [] }), [
    order.createdAt,
    order.deliveryStatus,
    order.trackingEvents,
  ]);

  const deliveredTimestamp = useMemo(() => {
    const deliveredEvent = sortedEvents.find((event) => `${event.status} ${event.activity}`.toLowerCase().includes("delivered"));
    return deliveredEvent?.eventTime || "";
  }, [sortedEvents]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/v1/orders/${order.orderId}/tracking`, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as { order?: OrderTrackingView };
      if (res.ok && body.order) {
        setOrder(body.order);
        setLastUpdatedAt(new Date());
      }
    } finally {
      setSyncing(false);
    }
  }, [order.orderId]);

  useEffect(() => {
    setMounted(true);
    setLastUpdatedAt(new Date());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const updateRelative = () => setRelativeUpdatedText(formatRelativeTime(lastUpdatedAt));
    updateRelative();
    const id = window.setInterval(updateRelative, 1000);
    return () => window.clearInterval(id);
  }, [lastUpdatedAt, mounted]);

  useEffect(() => {
    if (refreshMs <= 0) return;
    const id = window.setInterval(() => {
      void syncNow();
    }, refreshMs);
    return () => window.clearInterval(id);
  }, [syncNow, refreshMs]);

  const visibleEvents = showAllEvents ? sortedEvents : sortedEvents.slice(0, 3);

  return (
    <main className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-bold md:text-3xl">Track Order</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Last updated: {relativeUpdatedText}</span>
          <select value={String(refreshMs)} onChange={(e) => setRefreshMs(Number(e.target.value))} className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700">
            <option value="10000">Auto 10s</option>
            <option value="20000">Auto 20s</option>
            <option value="0">Auto Off</option>
          </select>
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={syncing}
            className="rounded bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-brand-yellow-dark disabled:opacity-60"
          >
            {syncing ? "Refreshing..." : "Refresh Live"}
          </button>
          <Link href="/account/orders" className="text-sm text-zinc-600 hover:text-zinc-900">
            Back to Orders
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-5">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start gap-4">
              {firstItem?.image ? (
                <Image src={firstItem.image} alt={firstItem.name} width={92} height={92} className="rounded-lg bg-white object-cover" />
              ) : (
                <div className="h-[92px] w-[92px] rounded-lg bg-zinc-200" />
              )}
              <div>
                <p className="text-lg font-semibold leading-tight">{firstItem?.name || "Order item"}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Order ID: <span className="font-medium text-zinc-900">{order.orderId}</span>
                </p>
                <p className="text-sm text-zinc-600">
                  Placed: <span className="text-zinc-800">{mounted ? formatDateTime(toIsoTime(order.createdAt)) : "--"}</span>
                </p>
              </div>
            </div>
          </div>

          {order.deliveryStatus === "delivered" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              ✅ Your order has been delivered! {deliveredTimestamp && mounted ? `Delivered at ${formatDateTime(deliveredTimestamp)}` : ""}
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold">Delivery Progress (Live)</h2>
            <ol className="mt-4 space-y-4">
              {timeline.map((step, idx) => (
                <li key={step.key} className="relative pl-8">
                  {idx < timeline.length - 1 ? <span className={`absolute left-[10px] top-5 h-10 w-[2px] ${step.completed ? "bg-brand-yellow" : "bg-zinc-300"}`} /> : null}
                  <span
                    className={`absolute left-0 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
                      step.completed ? "border-brand-yellow bg-brand-yellow/20 text-zinc-900" : "border-zinc-300 bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {step.completed ? "✓" : idx + 1}
                  </span>
                  <p className={`text-sm font-semibold ${step.active ? "text-zinc-900" : "text-zinc-700"}`}>{step.label}</p>
                  <p className="text-xs text-zinc-500">{step.description}</p>
                  {step.completed && step.timestamp && mounted ? <p className="text-[11px] text-zinc-500">{formatDateTime(step.timestamp)}</p> : null}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-700">Tracking Events</h3>
              {(sortedEvents.length ?? 0) > 3 ? (
                <button type="button" onClick={() => setShowAllEvents((value) => !value)} className="text-xs font-semibold text-zinc-600 hover:text-zinc-900">
                  {showAllEvents ? "Show latest 3" : `Show all (${sortedEvents.length})`}
                </button>
              ) : null}
            </div>
            {visibleEvents.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No tracking events yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {visibleEvents.map((event, idx) => (
                  <li key={`${event.status}-${event.eventTime}-${idx}`} className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <span className="font-medium">{mounted ? formatDateTime(event.eventTime) : "--"}</span>
                    {event.location ? ` • ${event.location}` : ""} — {event.activity}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-700">Delivery To</h3>
            <p className="mt-2 text-sm font-semibold">{order.shippingAddress?.name || "-"}</p>
            <p className="text-sm text-zinc-700">{order.shippingAddress?.line1 || "-"}</p>
            <p className="text-sm text-zinc-700">
              {order.shippingAddress?.city || "-"}, {order.shippingAddress?.state || "-"} {order.shippingAddress?.pincode || "-"}
            </p>
            <p className="text-sm text-zinc-700">Mobile: {order.shippingAddress?.phone || "-"}</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-700">Shipment Details</h3>
            <p className="mt-2 text-sm text-zinc-700">
              AWB: <span className="font-semibold text-zinc-900">{order.awbCode || "Not assigned yet"}</span>
            </p>
            <p className="text-sm text-zinc-700">
              Courier: <span className="font-semibold text-zinc-900">{order.courierName || "Awaiting assignment"}</span>
            </p>
            <p className="text-sm text-zinc-700">
              Status: <span className="font-semibold capitalize text-zinc-900">{(order.deliveryStatus || "pending").replaceAll("_", " ")}</span>
            </p>
            {order.awbCode ? (
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                  mockAwb ? "border border-amber-200 bg-amber-50 text-amber-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {mockAwb ? "🧪 Test Shipment" : "✅ Real Shipment"}
              </span>
            ) : null}
            {order.awbCode ? (
              isRealAwb ? (
                <Link
                  href={trackingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex rounded bg-brand-yellow px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-brand-yellow-dark"
                >
                  🚚 Open Live Tracking
                </Link>
              ) : (
                <p className="mt-3 inline-flex rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">Mock Mode — Live tracking unavailable</p>
              )
            ) : null}
          </div>

          {order.awbCode && mockAwb ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              🧪 This is a test shipment. Real tracking will be available once your order ships.
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-700">Order Snapshot</h3>
            <p className="mt-2 text-sm text-zinc-700">
              Items: <span className="font-semibold text-zinc-900">{order.items.length}</span>
            </p>
            <p className="text-sm text-zinc-700">
              Amount: <span className="font-semibold text-zinc-900">Rs.{(order.totalAmount ?? 0).toFixed(2)}</span>
            </p>
            <p className="text-sm text-zinc-700">
              Payment: <span className="font-semibold capitalize text-zinc-900">{(order.paymentMethod || "-").replaceAll("_", " ")}</span>
            </p>
            <p className="text-sm text-zinc-700">
              Payment Status: <span className="font-semibold capitalize text-zinc-900">{(order.paymentStatus || "-").replaceAll("_", " ")}</span>
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function buildTimeline(input: { deliveryStatus: string; createdAt?: string | Date; trackingEvents: TrackingEvent[] }): TimelineStep[] {
  const status = String(input.deliveryStatus || "pending").toLowerCase();
  const events = (input.trackingEvents ?? [])
    .map((event) => ({
      combined: `${event.status || ""} ${event.activity || ""}`.toLowerCase(),
      time: toIsoTime(event.eventTime),
    }))
    .sort((a, b) => toEpoch(a.time) - toEpoch(b.time));

  const eventTimeFor = (matcher: (text: string) => boolean) => events.find((event) => matcher(event.combined))?.time || "";

  const placedAt = toIsoTime(input.createdAt);
  const confirmedAt = eventTimeFor((text) => text.includes("confirm"));
  const pickedAt = eventTimeFor((text) => text.includes("pick"));
  const transitAt = eventTimeFor((text) => text.includes("transit") || text.includes("dispatch") || text.includes("shipped"));
  const outForDeliveryAt = eventTimeFor((text) => (text.includes("delivery") && !text.includes("delivered")) || text.includes("out for delivery"));
  const deliveredAt = eventTimeFor((text) => text.includes("delivered"));

  const isDelivered = status === "delivered" || !!deliveredAt;
  const hasOutForDelivery = status === "out_for_delivery" || !!outForDeliveryAt || isDelivered;
  const hasTransit = status === "shipped" || hasOutForDelivery || !!transitAt;
  const hasPicked = status === "processing" || hasTransit || !!pickedAt;
  const hasConfirmed = status === "confirmed" || hasPicked || !!confirmedAt;

  const completed = [true, hasConfirmed, hasPicked, hasTransit, hasOutForDelivery, isDelivered];
  const activeIndex = isDelivered ? 5 : hasOutForDelivery ? 4 : hasTransit ? 3 : hasPicked ? 2 : hasConfirmed ? 1 : 0;
  const timestamps = [placedAt, confirmedAt, pickedAt, transitAt, outForDeliveryAt, deliveredAt];

  return TIMELINE_STEPS.map((step, idx) => ({
    key: step.key,
    label: step.label,
    description: step.description,
    completed: completed[idx],
    active: idx === activeIndex,
    timestamp: timestamps[idx] || "",
  }));
}

function toIsoTime(value?: string | Date | null) {
  if (!value) return "";
  const epoch = new Date(value).getTime();
  if (!Number.isFinite(epoch)) return "";
  return new Date(epoch).toISOString();
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

function formatRelativeTime(lastUpdatedAt: Date | null) {
  if (!lastUpdatedAt) return "--";
  const diffSec = Math.max(0, Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000));
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

