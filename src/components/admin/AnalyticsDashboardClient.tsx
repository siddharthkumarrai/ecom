"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type AnalyticsResponse = {
  generatedAt: string;
  range: {
    preset: string;
    from: string;
    to: string;
  };
  compareRange: {
    from: string;
    to: string;
  };
  metrics: {
    totalRevenueMonth: number;
    totalRevenueToday: number;
    totalRevenueWeek: number;
    totalRevenueInRange: number;
    totalOrders: number;
    totalOrdersInRange: number;
    totalCustomers: number;
    totalProducts: number;
    avgOrderValue: number;
    pendingOrders: number;
  };
  comparison: {
    compareRevenue: number;
    compareOrders: number;
    revenueDeltaPercent: number;
    ordersDeltaPercent: number;
  };
  anomalyAlerts: Array<{ level: "info" | "warning" | "critical"; code: string; message: string }>;
  statusBreakdown: Array<{ _id: string; count: number }>;
  paymentBreakdown: Array<{ _id: string; count: number; revenue: number }>;
  lowStockProducts: Array<{ _id: string; name: string; sku: string; stock: number }>;
  revenueSeries: Array<{ date: string; revenue: number; orders: number }>;
  topProducts: Array<{ _id: string; name: string; quantity: number; revenue: number }>;
  recentOrders: Array<{
    _id: string;
    orderId: string;
    totalAmount: number;
    paymentStatus: string;
    deliveryStatus: string;
    createdAt: string;
  }>;
};

export function AnalyticsDashboardClient() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<"today" | "7d" | "30d" | "custom">("7d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [refreshSeconds, setRefreshSeconds] = useState(10);

  useEffect(() => {
    let isMounted = true;

    const pull = async () => {
      try {
        const params = new URLSearchParams();
        params.set("range", range);
        if (range === "custom" && fromDate && toDate) {
          params.set("from", fromDate);
          params.set("to", toDate);
        }
        const res = await fetch(`/api/v1/admin/analytics?${params.toString()}`, { cache: "no-store" });
        const body = (await res.json()) as AnalyticsResponse | { error?: string };
        if (!res.ok) throw new Error((body as { error?: string }).error ?? "Failed to fetch analytics");
        if (isMounted) {
          setData(body as AnalyticsResponse);
          setError("");
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e.message : "Failed to fetch analytics");
          setLoading(false);
        }
      }
    };

    pull();
    const timer = setInterval(pull, Math.max(3, refreshSeconds) * 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [range, fromDate, toDate, refreshSeconds]);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Revenue (Selected Range)", value: `Rs ${data.metrics.totalRevenueInRange}`, tone: "bg-emerald-50 border-emerald-100" },
      { label: "Revenue (Today)", value: `Rs ${data.metrics.totalRevenueToday}`, tone: "bg-blue-50 border-blue-100" },
      { label: "Orders (Selected Range)", value: String(data.metrics.totalOrdersInRange), tone: "bg-violet-50 border-violet-100" },
      { label: "Avg Order Value", value: `Rs ${data.metrics.avgOrderValue}`, tone: "bg-amber-50 border-amber-100" },
      { label: "Customers", value: String(data.metrics.totalCustomers), tone: "bg-cyan-50 border-cyan-100" },
      { label: "Pending Orders", value: String(data.metrics.pendingOrders), tone: "bg-rose-50 border-rose-100" },
    ];
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[] = [];
    rows.push("section,key,value");
    rows.push(`metrics,totalRevenueInRange,${data.metrics.totalRevenueInRange}`);
    rows.push(`metrics,totalOrdersInRange,${data.metrics.totalOrdersInRange}`);
    rows.push(`metrics,avgOrderValue,${data.metrics.avgOrderValue}`);
    rows.push(`comparison,revenueDeltaPercent,${data.comparison.revenueDeltaPercent}`);
    rows.push(`comparison,ordersDeltaPercent,${data.comparison.ordersDeltaPercent}`);
    data.statusBreakdown.forEach((row) => rows.push(`statusBreakdown,${row._id},${row.count}`));
    data.paymentBreakdown.forEach((row) => rows.push(`paymentBreakdown,${row._id}_count,${row.count}`));
    data.paymentBreakdown.forEach((row) => rows.push(`paymentBreakdown,${row._id}_revenue,${row.revenue}`));
    data.revenueSeries.forEach((row) => rows.push(`revenueSeries,${row.date},${row.revenue}`));
    data.topProducts.forEach((row) => rows.push(`topProducts,${sanitizeCsv(row.name)},${row.revenue}`));

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-zinc-500">Loading analytics...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-zinc-500">No analytics data available.</p>;

  return (
    <section className="text-zinc-900">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-xs text-zinc-500">
          Live refresh every {refreshSeconds}s · {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-white p-3 shadow-sm">
        <button onClick={() => setRange("today")} className={`rounded px-3 py-1 text-sm ${range === "today" ? "bg-brand-yellow font-semibold" : "bg-zinc-100"}`}>
          Today
        </button>
        <button onClick={() => setRange("7d")} className={`rounded px-3 py-1 text-sm ${range === "7d" ? "bg-brand-yellow font-semibold" : "bg-zinc-100"}`}>
          7D
        </button>
        <button onClick={() => setRange("30d")} className={`rounded px-3 py-1 text-sm ${range === "30d" ? "bg-brand-yellow font-semibold" : "bg-zinc-100"}`}>
          30D
        </button>
        <button onClick={() => setRange("custom")} className={`rounded px-3 py-1 text-sm ${range === "custom" ? "bg-brand-yellow font-semibold" : "bg-zinc-100"}`}>
          Custom
        </button>
        {range === "custom" ? (
          <>
            <input type="date" className="rounded border px-2 py-1 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" className="rounded border px-2 py-1 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </>
        ) : null}
        <label className="ml-auto flex items-center gap-2 text-sm">
          Refresh(s)
          <input
            type="number"
            min={3}
            max={60}
            value={refreshSeconds}
            onChange={(e) => setRefreshSeconds(Number(e.target.value) || 10)}
            className="w-16 rounded border px-2 py-1"
          />
        </label>
        <button onClick={exportCsv} className="rounded bg-zinc-900 px-3 py-1 text-sm font-semibold text-white">
          Export CSV
        </button>
      </div>

      {data.anomalyAlerts.length ? (
        <div className="mt-4 space-y-2">
          {data.anomalyAlerts.map((alert) => (
            <div
              key={alert.code}
              className={`rounded border p-3 text-sm ${
                alert.level === "critical"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : alert.level === "warning"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-blue-300 bg-blue-50 text-blue-900"
              }`}
            >
              <span className="font-semibold">{alert.code}:</span> {alert.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className={`rounded border p-4 shadow-sm ${card.tone}`}>
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Revenue Trend</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#F5C400" strokeWidth={2} />
                <Line type="monotone" dataKey="orders" stroke="#0066CC" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Delivery Status Breakdown</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.statusBreakdown.map((d) => ({ status: d._id, count: d.count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0066CC" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Top Products</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.topProducts.map((row) => (
              <li key={row._id} className="flex items-center justify-between">
                <span className="truncate pr-2">{row.name}</span>
                <span>
                  Qty {row.quantity} · Rs {row.revenue}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Payment Method Mix</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.paymentBreakdown.map((d) => ({ method: d._id, count: d.count, revenue: d.revenue }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#1A1A1A" />
                <Bar dataKey="revenue" fill="#F5C400" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Low Stock Alerts</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.lowStockProducts.length ? (
            data.lowStockProducts.map((row) => (
              <li key={row._id} className="flex items-center justify-between">
                <span className="truncate pr-2">{row.name}</span>
                <span>Stock {row.stock}</span>
              </li>
            ))
          ) : (
            <li className="text-zinc-500">No low-stock products.</li>
          )}
        </ul>
      </div>

      <div className="mt-6 rounded border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Recent Orders</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="py-2">Order</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Payment</th>
                <th className="py-2">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr key={order._id} className="border-t">
                  <td className="py-2">{order.orderId}</td>
                  <td className="py-2">Rs {order.totalAmount}</td>
                  <td className="py-2">{order.paymentStatus}</td>
                  <td className="py-2">{order.deliveryStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-xs text-zinc-500">
        Range from {new Date(data.range.from).toLocaleDateString()} to {new Date(data.range.to).toLocaleDateString()} · All-time month revenue: Rs{" "}
        {data.metrics.totalRevenueMonth} · Compare range {new Date(data.compareRange.from).toLocaleDateString()} to{" "}
        {new Date(data.compareRange.to).toLocaleDateString()} · Revenue delta {data.comparison.revenueDeltaPercent}% · Orders delta{" "}
        {data.comparison.ordersDeltaPercent}%
      </div>
    </section>
  );
}

function sanitizeCsv(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

