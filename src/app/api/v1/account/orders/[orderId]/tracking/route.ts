import { json, error } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { getShippingProvider } from "@/lib/providers/shipping/ShiprocketProvider";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orderId: string }>;
}

export async function GET(req: Request, { params }: Props) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  const { orderId } = await params;
  const url = new URL(req.url);
  const shouldSyncProvider = url.searchParams.get("sync") === "1";
  await connectDB();
  const order = await Order.findOne({ user: user._id, orderId });
  if (!order) return error("Order not found", 404);

  if (shouldSyncProvider && order.awbCode) {
    try {
      const shipping = getShippingProvider();
      const tracking = await shipping.trackShipment({ awbCode: order.awbCode });
      order.trackingUrl = tracking.trackingUrl || order.trackingUrl;
      order.courierName = tracking.courierName || order.courierName;
      order.deliveryStatus = normalizeDeliveryStatus(tracking.status) ?? order.deliveryStatus;
      order.set("trackingEvents", (tracking.events ?? []).map((event) => ({
        status: normalizeDeliveryStatus(event.status || event.activity || "") ?? order.deliveryStatus,
        activity: event.activity || event.status || "",
        location: event.location || "",
        eventTime: event.eventTime ? new Date(event.eventTime) : undefined,
      })));
      await order.save();
    } catch {
      // Keep returning latest persisted order even when provider is temporarily unavailable.
    }
  }

  return json({
    order: {
      orderId: order.orderId,
      createdAt: order.createdAt,
      items: order.items ?? [],
      totalAmount: order.totalAmount ?? 0,
      shippingAddress: order.shippingAddress,
      deliveryStatus: order.deliveryStatus ?? "pending",
      paymentMethod: order.paymentMethod ?? "",
      paymentStatus: order.paymentStatus ?? "",
      awbCode: order.awbCode ?? "",
      courierName: order.courierName ?? "",
      trackingUrl: order.trackingUrl ?? "",
      trackingEvents: order.trackingEvents ?? [],
    },
  });
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
