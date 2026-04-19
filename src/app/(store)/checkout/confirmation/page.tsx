import Link from "next/link";
import { CheckoutStepper } from "@/components/store/checkout/CheckoutStepper";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";

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

export default async function ConfirmationPage() {
  const { user } = await requireUser();
  let trackingUrl = "";
  let latestOrderId = "";
  let subtotal = 0;
  let taxAmount = 0;
  let shippingCharge = 0;
  let discount = 0;
  let totalAmount = 0;
  let paymentMethod = "";
  let paymentStatus = "";
  let deliveryStatus = "";
  if (user?._id) {
    await connectDB();
    const latestOrder = await Order.findOne({ user: user._id })
      .sort({ createdAt: -1 })
      .select("orderId trackingUrl subtotal taxAmount shippingCharge discount totalAmount paymentMethod paymentStatus deliveryStatus")
      .lean();
    latestOrderId = latestOrder?.orderId ?? "";
    trackingUrl = latestOrder?.trackingUrl ?? "";
    subtotal = latestOrder?.subtotal ?? 0;
    taxAmount = latestOrder?.taxAmount ?? 0;
    shippingCharge = latestOrder?.shippingCharge ?? 0;
    discount = latestOrder?.discount ?? 0;
    totalAmount = latestOrder?.totalAmount ?? 0;
    paymentMethod = latestOrder?.paymentMethod ?? "";
    paymentStatus = latestOrder?.paymentStatus ?? "";
    deliveryStatus = latestOrder?.deliveryStatus ?? "";
  }

  return (
    <main>
      <CheckoutStepper active="Confirmation" />
      <div className="rounded border border-zinc-200 p-6 text-center">
        <h1 className="text-3xl font-bold">Order Confirmed</h1>
        <p className="mt-3 text-zinc-600">Your order has been placed successfully. We have shared tracking updates on your account.</p>
        {latestOrderId ? (
          <p className="mt-2 text-sm font-medium text-zinc-700">
            Order ID: <span className="font-semibold">{latestOrderId}</span>
          </p>
        ) : null}
        {latestOrderId ? (
          <div className="mx-auto mt-4 max-w-md rounded border border-zinc-200 bg-zinc-50 p-4 text-left text-sm text-zinc-700">
            <p>
              Payment Method: <span className="float-right font-semibold uppercase">{paymentMethod || "-"}</span>
            </p>
            <p>
              Payment Status:{" "}
              <span className={`float-right rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${paymentStatusBadgeClass(paymentStatus)}`}>
                {paymentStatus ? paymentStatus.replaceAll("_", " ") : "-"}
              </span>
            </p>
            <p>
              Delivery Status:{" "}
              <span className={`float-right rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${deliveryStatusBadgeClass(deliveryStatus)}`}>
                {deliveryStatus ? deliveryStatus.replaceAll("_", " ") : "-"}
              </span>
            </p>
            <hr className="my-2 border-zinc-200" />
            <p>
              Subtotal: <span className="float-right font-semibold">Rs.{subtotal.toFixed(2)}</span>
            </p>
            <p>
              Tax: <span className="float-right font-semibold">Rs.{taxAmount.toFixed(2)}</span>
            </p>
            <p>
              Delivery: <span className="float-right font-semibold">Rs.{shippingCharge.toFixed(2)}</span>
            </p>
            <p>
              Discount: <span className="float-right font-semibold">-Rs.{discount.toFixed(2)}</span>
            </p>
            <hr className="my-2 border-zinc-200" />
            <p className="text-base text-zinc-900">
              Total: <span className="float-right font-bold">Rs.{totalAmount.toFixed(2)}</span>
            </p>
          </div>
        ) : null}
        <Link href="/account/orders" className="mt-5 inline-block rounded bg-brand-yellow px-4 py-2 font-semibold">
          View Orders
        </Link>
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-2 mt-5 inline-flex items-center justify-center rounded bg-[#f5c400] px-4 py-2 font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-[#ffd84d]"
          >
            Track Order
          </a>
        ) : null}
      </div>
    </main>
  );
}

