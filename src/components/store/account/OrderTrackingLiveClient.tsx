"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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

const STEP_ORDER = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"] as const;

export default function OrderTrackingLiveClient({ initial }: { initial: OrderTrackingView }) {
  const [order, setOrder] = useState<OrderTrackingView>(initial);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshMs, setRefreshMs] = useState<number>(20000);
  const [nowTick, setNowTick] = useState<number>(0);

  const timeline = useMemo(() => buildTimeline(order.deliveryStatus, order.trackingEvents ?? []), [order.deliveryStatus, order.trackingEvents]);
  const firstItem = order.items?.[0];

  const syncNow = useCallback(async (syncProvider = false) => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/v1/account/orders/${order.orderId}/tracking${syncProvider ? "?sync=1" : ""}`, { cache: "no-store" });
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
    setLastUpdatedAt(new Date());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (refreshMs <= 0) return;
    const id = window.setInterval(() => {
      void syncNow(false);
    }, refreshMs);
    return () => window.clearInterval(id);
  }, [syncNow, refreshMs]);

  return (
    <main className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-bold md:text-3xl">Track Order</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Last updated: {formatRelativeTime(lastUpdatedAt, nowTick)}</span>
          <select
            value={String(refreshMs)}
            onChange={(e) => setRefreshMs(Number(e.target.value))}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
          >
            <option value="10000">Auto 10s</option>
            <option value="20000">Auto 20s</option>
            <option value="0">Auto Off</option>
          </select>
          <button
            type="button"
            onClick={() => void syncNow(true)}
            disabled={syncing}
            className="rounded bg-[#f5c400] px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-[#ffd84d] disabled:opacity-60"
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
                  Placed:{" "}
                  <span className="text-zinc-800">
                    {new Date(order.createdAt ?? new Date()).toLocaleDateString()} {new Date(order.createdAt ?? new Date()).toLocaleTimeString()}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold">Delivery Progress (Live)</h2>
            <ol className="mt-4 space-y-4">
              {timeline.map((step, idx) => (
                <li key={step.key} className="relative pl-8">
                  {idx < timeline.length - 1 ? <span className={`absolute left-[10px] top-5 h-10 w-[2px] ${step.completed ? "bg-[#f5c400]" : "bg-zinc-300"}`} /> : null}
                  <span
                    className={`absolute left-0 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
                      step.completed ? "border-[#f5c400] bg-[#fff6c7] text-zinc-900" : "border-zinc-300 bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {step.completed ? "✓" : idx + 1}
                  </span>
                  <p className={`text-sm font-semibold ${step.active ? "text-zinc-900" : "text-zinc-700"}`}>{step.label}</p>
                  <p className="text-xs text-zinc-500">{step.description}</p>
                </li>
              ))}
            </ol>
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
            <Link
              href={order.trackingUrl || `/account/orders/${order.orderId}/track`}
              target={order.trackingUrl ? "_blank" : undefined}
              className="mt-3 inline-flex rounded bg-[#f5c400] px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-[#ffd84d]"
            >
              Open Live Tracking
            </Link>
          </div>

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

function buildTimeline(deliveryStatus: string, events: TrackingEvent[]) {
  if (events?.length) {
    return events
      .slice()
      .sort((a, b) => toEpoch(b.eventTime) - toEpoch(a.eventTime))
      .map((event, idx) => {
        const when = event.eventTime ? new Date(event.eventTime).toLocaleString() : "";
        return {
          key: `${event.status || "event"}-${idx}`,
          label: event.activity || (event.status ? event.status.replaceAll("_", " ") : "Update"),
          description: [event.location, when].filter(Boolean).join(" - "),
          completed: true,
          active: idx === 0,
        };
      });
  }

  const current = normalizeStatus(deliveryStatus);
  const currentIndex = STEP_ORDER.indexOf(current as (typeof STEP_ORDER)[number]);
  const statusLabels: Record<string, { label: string; description: string }> = {
    pending: { label: "Order Placed", description: "Your order is placed successfully." },
    confirmed: { label: "Order Confirmed", description: "Seller confirmed and preparing your package." },
    processing: { label: "Packed", description: "Items are packed and ready for dispatch." },
    shipped: { label: "Shipped", description: "Package handed over to courier partner." },
    out_for_delivery: { label: "Out for Delivery", description: "Rider is on the way to your address." },
    delivered: { label: "Delivered", description: "Order delivered successfully." },
  };

  return STEP_ORDER.map((key, idx) => {
    const meta = statusLabels[key];
    const completed = currentIndex >= 0 ? idx <= currentIndex : idx === 0;
    return {
      key,
      label: meta.label,
      description: meta.description,
      completed,
      active: idx === (currentIndex >= 0 ? currentIndex : 0),
    };
  });
}

function normalizeStatus(status: string) {
  if (status === "cancelled" || status === "returned") return "delivered";
  if (STEP_ORDER.includes(status as (typeof STEP_ORDER)[number])) return status;
  return "pending";
}

function toEpoch(value?: Date | string | null) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatRelativeTime(lastUpdatedAt: Date | null, tick: number) {
  void tick;
  if (!lastUpdatedAt) return "--";
  const diffSec = Math.max(0, Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000));
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}
