import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { getShippingProvider } from "@/lib/providers/shipping/ShiprocketProvider";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function TrackOrderPage({ params }: Props) {
  const { user } = await requireUser();
  if (!user?._id) redirect("/sign-in?redirect_url=/account/orders");

  const { orderId } = await params;
  await connectDB();
  const order = await Order.findOne({ user: user._id, orderId })
    .select("orderId createdAt trackingUrl awbCode courierName deliveryStatus paymentStatus paymentMethod totalAmount shippingAddress items shiprocketShipmentId")
    .lean();
  if (!order) redirect("/account/orders");

  if (order.trackingUrl) redirect(order.trackingUrl);

  try {
    const shipping = getShippingProvider();
    let awbCode = order.awbCode || "";
    if (!awbCode && !order.shiprocketShipmentId && (order.paymentStatus === "paid" || order.paymentMethod === "cod")) {
      const shipment = await shipping.createShipment({
        orderId: order.orderId,
        createdAt: order.createdAt ?? new Date(),
        shippingAddress: {
          name: order.shippingAddress?.name ?? "",
          line1: order.shippingAddress?.line1 ?? "",
          city: order.shippingAddress?.city ?? "",
          pincode: order.shippingAddress?.pincode ?? "",
          state: order.shippingAddress?.state ?? "",
          phone: order.shippingAddress?.phone ?? "",
        },
        items: (order.items ?? []).map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          hsnCode: item.hsnCode ?? "",
        })),
        paymentMethod: order.paymentMethod === "cod" ? "cod" : "prepaid",
        totalAmount: order.totalAmount ?? 0,
      });
      awbCode = shipment.awbCode ?? "";
      await Order.updateOne(
        { user: user._id, orderId },
        {
          $set: {
            shiprocketShipmentId: shipment.shipmentId || order.shiprocketShipmentId || "",
            awbCode: awbCode || order.awbCode || "",
            deliveryStatus: "processing",
          },
        }
      );
    }
    if (!awbCode) redirect("/account/orders?tracking=unavailable");
    const tracking = await shipping.trackShipment({ awbCode });
    const trackingUrl = tracking.trackingUrl || "";
    if (trackingUrl) {
      await Order.updateOne(
        { user: user._id, orderId },
        {
          $set: {
            trackingUrl,
            courierName: tracking.courierName || order.courierName || "",
            deliveryStatus: normalizeDeliveryStatus(tracking.status) ?? order.deliveryStatus ?? "processing",
            trackingEvents: (tracking.events ?? []).map((event) => ({
              status: normalizeDeliveryStatus(event.status || event.activity || "") ?? order.deliveryStatus ?? "processing",
              activity: event.activity || event.status || "",
              location: event.location || "",
              eventTime: event.eventTime ? new Date(event.eventTime) : undefined,
            })),
          },
        }
      );
      redirect(trackingUrl);
    }
    redirect(`https://shiprocket.co/tracking/${encodeURIComponent(awbCode)}`);
  } catch {
    // If provider call fails, fallback to orders page.
  }

  redirect("/account/orders?tracking=failed");
}

function normalizeDeliveryStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("delivered")) return "delivered";
  if (normalized.includes("out for delivery")) return "out_for_delivery";
  if (normalized.includes("shipped")) return "shipped";
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("return")) return "returned";
  if (normalized.includes("process")) return "processing";
  if (normalized.includes("confirm")) return "confirmed";
  return null;
}
