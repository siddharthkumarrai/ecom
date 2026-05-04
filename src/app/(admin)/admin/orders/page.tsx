"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type OrderRow = {
  orderId: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryStatus: string;
  shiprocketShipmentId?: string;
  awbCode?: string;
  createdAt: string;
};

const PAGE_SIZE = 15;
const FILTERS = ["all", "awaiting_confirmation", "ready_to_ship", "shipped", "delivered", "cancelled"] as const;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/v1/admin/shipments", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as { items?: OrderRow[] };
    setOrders(Array.isArray(body.items) ? body.items : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      awaiting_confirmation: orders.filter((order) => order.paymentStatus === "paid" && order.deliveryStatus === "pending").length,
      ready_to_ship: orders.filter((order) => order.deliveryStatus === "confirmed").length,
      shipped: orders.filter((order) => order.deliveryStatus === "shipped" || order.deliveryStatus === "out_for_delivery").length,
      delivered: orders.filter((order) => order.deliveryStatus === "delivered").length,
      cancelled: orders.filter((order) => order.deliveryStatus === "cancelled" || order.deliveryStatus === "returned").length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (query && !order.orderId.toLowerCase().includes(query)) return false;
      if (activeFilter === "all") return true;
      if (activeFilter === "awaiting_confirmation") return order.paymentStatus === "paid" && order.deliveryStatus === "pending";
      if (activeFilter === "ready_to_ship") return order.deliveryStatus === "confirmed";
      if (activeFilter === "shipped") return order.deliveryStatus === "shipped" || order.deliveryStatus === "out_for_delivery";
      if (activeFilter === "delivered") return order.deliveryStatus === "delivered";
      if (activeFilter === "cancelled") return order.deliveryStatus === "cancelled" || order.deliveryStatus === "returned";
      return true;
    });
  }, [activeFilter, orders, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageItems = filteredOrders.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);

  const confirmOrder = async (order: OrderRow) => {
    setError("");
    setBusyOrderId(order.orderId);
    const res = await fetch(`/api/v1/admin/orders/${order.orderId}/confirm`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; order?: OrderRow };
    if (!res.ok || !body.order) {
      setError(body.error || "Failed to confirm order.");
      setBusyOrderId(null);
      return;
    }

    setOrders((prev) => prev.map((row) => (row.orderId === order.orderId ? { ...row, ...body.order } : row)));
    toast.success(`✅ Order confirmed for ${order.orderId}`);
    setBusyOrderId(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, search]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">Confirm orders, move ready orders to shipment, and jump to tracking quickly.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                activeFilter === filter ? "border-[#f5c400] bg-[#f5c400] text-zinc-900" : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {filterLabel(filter)} <span className="ml-1 rounded-full bg-white/70 px-1.5 py-0.5">{counts[filter]}</span>
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID"
          className="mb-4 w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3">Order</th>
                <th className="py-3">Date</th>
                <th className="py-3">Amount</th>
                <th className="py-3">Payment</th>
                <th className="py-3">Delivery</th>
                <th className="py-3">Shipment</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((order) => {
                const canConfirm = order.paymentStatus === "paid" && order.deliveryStatus === "pending";
                const canCreateShipment = order.deliveryStatus === "confirmed" && !order.awbCode;
                const hasAwb = !!order.awbCode;

                return (
                  <tr key={order.orderId} className="border-b last:border-0">
                    <td className="py-3 font-semibold text-slate-800">{order.orderId}</td>
                    <td className="py-3 text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-slate-700">₹ {order.totalAmount}</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${paymentBadgeClass(order.paymentMethod, order.paymentStatus)}`}>
                        {order.paymentMethod === "cod" ? "cod" : order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${deliveryBadgeClass(order.deliveryStatus)}`}>
                        {order.deliveryStatus.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{order.awbCode || order.shiprocketShipmentId || "-"}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {canConfirm ? (
                          <button
                            type="button"
                            onClick={() => void confirmOrder(order)}
                            disabled={busyOrderId === order.orderId}
                            className="rounded bg-[#f5c400] px-2 py-1 text-xs font-semibold text-zinc-900 hover:bg-[#ffd84d] disabled:opacity-60"
                          >
                            {busyOrderId === order.orderId ? "Confirming..." : "✅ Confirm"}
                          </button>
                        ) : null}
                        {canCreateShipment ? (
                          <Link href={`/admin/tracking?orderId=${encodeURIComponent(order.orderId)}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            📦 Create Shipment
                          </Link>
                        ) : null}
                        {hasAwb ? (
                          <Link href={`/admin/tracking?orderId=${encodeURIComponent(order.orderId)}`} className="rounded border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                            🚚 Track
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageItems.length === 0 ? (
                <tr>
                  <td className="py-4 text-sm text-slate-500" colSpan={7}>
                    No orders found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {(currentPageSafe - 1) * PAGE_SIZE + (pageItems.length ? 1 : 0)}-{(currentPageSafe - 1) * PAGE_SIZE + pageItems.length} of {filteredOrders.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPageSafe <= 1}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-slate-600">
              Page {currentPageSafe} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPageSafe >= totalPages}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </div>
    </section>
  );
}

function deliveryBadgeClass(status: string) {
  const value = status.toLowerCase();
  if (value === "pending") return "bg-slate-100 text-slate-700";
  if (value === "confirmed") return "bg-blue-100 text-blue-700";
  if (value === "shipped" || value === "processing") return "bg-orange-100 text-orange-700";
  if (value === "out_for_delivery") return "bg-[#f5c400]/20 text-[#8a6d00]";
  if (value === "delivered") return "bg-emerald-100 text-emerald-700";
  if (value === "cancelled" || value === "returned") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function paymentBadgeClass(paymentMethod: string, paymentStatus: string) {
  if (paymentMethod === "cod") return "bg-blue-100 text-blue-700";
  const value = paymentStatus.toLowerCase();
  if (value === "paid") return "bg-emerald-100 text-emerald-700";
  if (value === "pending") return "bg-slate-100 text-slate-700";
  if (value === "abandoned" || value === "failed" || value === "refunded" || value === "partial_refund") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function filterLabel(filter: (typeof FILTERS)[number]) {
  if (filter === "all") return "All";
  if (filter === "awaiting_confirmation") return "Awaiting Confirmation";
  if (filter === "ready_to_ship") return "Ready to Ship";
  if (filter === "shipped") return "Shipped";
  if (filter === "delivered") return "Delivered";
  if (filter === "cancelled") return "Cancelled";
  return filter;
}

