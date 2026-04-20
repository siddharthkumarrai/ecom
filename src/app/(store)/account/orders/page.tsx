import { getSiteConfigOrMock } from "@/lib/store/data";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import Link from "next/link";

function paymentStatusBadgeClass(status: string) {
  const value = status.toLowerCase();
  if (value === "paid") return "bg-emerald-100 text-emerald-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";
  if (value === "failed" || value === "abandoned" || value === "refunded" || value === "partial_refund") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-zinc-100 text-zinc-700";
}

function deliveryStatusBadgeClass(status: string) {
  const value = status.toLowerCase();
  if (value === "delivered") return "bg-emerald-100 text-emerald-700";
  if (value === "cancelled" || value === "returned") return "bg-rose-100 text-rose-700";
  if (value === "pending" || value === "processing" || value === "confirmed" || value === "shipped" || value === "out_for_delivery") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-zinc-100 text-zinc-700";
}

interface Props {
  searchParams?: Promise<{ tracking?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
  const resolvedParams = searchParams ? await searchParams : {};
  const trackingState = resolvedParams?.tracking ?? "";
  const [{ config }, { user }] = await Promise.all([getSiteConfigOrMock(), requireUser()]);
  let orders: Array<{
    orderId: string;
    createdAt: Date;
    totalAmount: number;
    deliveryStatus: string;
    paymentStatus: string;
    trackingUrl?: string;
    awbCode?: string;
    canRequestTracking?: boolean;
  }> = [];

  if (user?._id) {
    await connectDB();
    const dbOrders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("orderId createdAt totalAmount deliveryStatus paymentStatus paymentMethod trackingUrl awbCode")
      .lean();
    orders = dbOrders.map((order) => ({
      orderId: order.orderId,
      createdAt: order.createdAt ?? new Date(),
      totalAmount: order.totalAmount ?? 0,
      deliveryStatus: order.deliveryStatus ?? "pending",
      paymentStatus: order.paymentStatus ?? "pending",
      trackingUrl: order.trackingUrl || "",
      awbCode: order.awbCode || "",
      canRequestTracking: order.paymentStatus === "paid" || order.paymentMethod === "cod",
    }));
  }

  return (
    <main className="rounded border border-zinc-200 bg-white p-3 sm:p-4">
      <h1 className="text-[32px] font-semibold leading-none sm:text-[44px]">{config.account.orders.heading}</h1>
      {trackingState === "failed" ? (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tracking link is being prepared. Please try &quot;Track Order&quot; again in a moment.
        </p>
      ) : null}
      {trackingState === "unavailable" ? (
        <p className="mt-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          Tracking is not available for this order yet.
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] text-[13px]">
          <thead className="text-left text-zinc-500">
            <tr>
              <th className="whitespace-nowrap py-2 pr-4">{config.account.orders.orderIdLabel}</th>
              <th className="whitespace-nowrap py-2 pr-4">{config.account.orders.dateLabel}</th>
              <th className="whitespace-nowrap py-2 pr-4">{config.account.orders.amountLabel}</th>
              <th className="whitespace-nowrap py-2 pr-4">{config.account.orders.deliveryStatusLabel}</th>
              <th className="whitespace-nowrap py-2 pr-4">{config.account.orders.paymentStatusLabel}</th>
              <th className="whitespace-nowrap py-2">{config.account.orders.optionsLabel}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length ? (
              orders.map((order) => (
                <tr key={order.orderId} className="border-t border-zinc-100">
                  <td className="whitespace-nowrap py-3 pr-4 text-zinc-700">{order.orderId}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-zinc-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-zinc-700">₹ {order.totalAmount.toFixed(2)}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-zinc-600">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${deliveryStatusBadgeClass(order.deliveryStatus)}`}>
                      {order.deliveryStatus.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-zinc-600">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${paymentStatusBadgeClass(order.paymentStatus)}`}>
                      {order.paymentStatus.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="py-3">
                    {order.trackingUrl || order.awbCode || order.canRequestTracking ? (
                      <div className="space-y-1">
                        <Link
                          href={`/account/orders/${order.orderId}`}
                          className="inline-flex items-center justify-center rounded bg-[#f5c400] px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-[#ffd84d]"
                        >
                          Track Order
                        </Link>
                        {order.awbCode ? <p className="text-[11px] text-zinc-500">AWB: {order.awbCode}</p> : null}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">Tracking not available yet</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-3 text-zinc-600" colSpan={6}>
                  {config.account.orders.emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
