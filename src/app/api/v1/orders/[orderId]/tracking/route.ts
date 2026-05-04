import { json, error } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { normalizeDeliveryStatus } from "@/lib/orders/deliveryStatus";
import { getShippingProvider } from "@/lib/providers/shipping/ShiprocketProvider";
import { isMockAWB } from "@/lib/providers/shipping/awb";

export const dynamic = "force-dynamic";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface Props {
  params: Promise<{ orderId: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  const { orderId } = await params;
  await connectDB();
  const order = await Order.findOne({ orderId });
  if (!order) return error("Order not found", 404);
  if (String(order.user) !== String(user._id)) return error("Forbidden", 403);

  const awbCode = order.awbCode || "";
  if (!awbCode) {
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
        awbCode: null,
        courierName: order.courierName ?? "",
        trackingUrl: "",
        trackingEvents: [],
      },
    });
  }

  if (!isMockAWB(awbCode)) {
    const lastSyncAt = order.lastTrackingSyncAt ? new Date(order.lastTrackingSyncAt).getTime() : 0;
    const shouldSync = !lastSyncAt || Date.now() - lastSyncAt >= FIVE_MINUTES_MS;
    if (shouldSync) {
      const shipping = getShippingProvider();
      const tracking = await shipping.trackShipment({ awbCode });
      const mappedEvents = (tracking.events ?? []).map((event) => ({
        status: event.status || "",
        activity: event.description || event.activity || "",
        location: event.location || "",
        eventTime: event.eventTime ? new Date(event.eventTime) : new Date(),
      }));

      order.trackingUrl = tracking.trackingUrl || order.trackingUrl;
      order.courierName = tracking.courierName || order.courierName;
      order.deliveryStatus = normalizeDeliveryStatus(tracking.currentStatus || tracking.status) ?? order.deliveryStatus;
      order.lastTrackingSyncAt = new Date();
      if (mappedEvents.length > 0) {
        order.set("trackingEvents", mappedEvents);
      }
      await order.save();
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

