import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { normalizeDeliveryStatus } from "@/lib/orders/deliveryStatus";
import { getShippingProvider } from "@/lib/providers/shipping/ShiprocketProvider";
import { isMockAWB } from "@/lib/providers/shipping/awb";

const CreateSchema = z.object({ orderId: z.string().min(1) });
const TrackSchema = z.object({
  orderId: z.string().min(1),
  mode: z.enum(["sync", "manual"]).optional().default("sync"),
  awbCode: z.string().optional(),
  courierName: z.string().optional(),
  trackingUrl: z.string().optional(),
  deliveryStatus: z.enum(["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"]).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  await connectDB();
  const items = await Order.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .select("orderId totalAmount paymentMethod paymentStatus deliveryStatus shiprocketShipmentId awbCode trackingUrl courierName createdAt trackingEvents")
    .lean();
  return json({ items });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  const order = await Order.findOne({ orderId: parsed.data.orderId });
  if (!order) return error("Order not found", 404);
  if (order.shiprocketShipmentId && order.awbCode) return json({ ok: true, item: order });
  if (order.deliveryStatus !== "confirmed") return error("Confirm order first", 400);

  const shipping = getShippingProvider();
  let shipment: Awaited<ReturnType<typeof shipping.createShipment>>;
  try {
    shipment = await shipping.createShipment({
      orderId: order.orderId,
      createdAt: order.createdAt,
      customerEmail: "",
      shippingAddress: {
        name: order.shippingAddress.name,
        line1: order.shippingAddress.line1,
        line2: order.shippingAddress.line2,
        city: order.shippingAddress.city,
        pincode: order.shippingAddress.pincode,
        state: order.shippingAddress.state,
        phone: order.shippingAddress.phone,
      },
      items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        hsnCode: item.hsnCode,
        productId: String(item.product ?? ""),
      })),
      paymentMethod: order.paymentMethod === "cod" ? "cod" : "prepaid",
      subtotal: order.subtotal ?? order.totalAmount,
      totalAmount: order.totalAmount,
    });
  } catch (e) {
    return error("Failed to create shipment", 400, String(e));
  }

  if (!shipment.success) return error("Failed to create shipment", 400, shipment.error || "Unknown error");

  const nextTrackingUrl = shipment.awbCode && !isMockAWB(shipment.awbCode) ? order.trackingUrl || `https://shiprocket.co/tracking/${encodeURIComponent(shipment.awbCode)}` : "";
  const nextCourierName = shipment.courier || order.courierName || (shipment.awbCode ? "Shiprocket" : "");
  const nextDeliveryStatus: string = shipment.awbCode ? "shipped" : "confirmed";
  let nextTrackingEvents = Array.isArray(order.trackingEvents) ? order.trackingEvents : [];

  nextTrackingEvents = [
    {
      status: "Shipment Created",
      activity: "Shipment created by admin",
      location: "Warehouse",
      eventTime: new Date(),
    },
    ...nextTrackingEvents,
  ].slice(0, 30);

  const updated = await Order.findOneAndUpdate(
    { _id: order._id },
    {
      $set: {
        shiprocketShipmentId: shipment.shiprocketShipmentId || shipment.shipmentId,
        awbCode: shipment.awbCode,
        trackingUrl: nextTrackingUrl,
        courierName: nextCourierName || "Shiprocket",
        deliveryStatus: nextDeliveryStatus,
        trackingEvents: nextTrackingEvents,
      },
    },
    { returnDocument: "after" }
  ).lean();

  return json({ ok: true, item: updated });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);
  const body = await req.json().catch(() => null);
  const parsed = TrackSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  const order = await Order.findOne({ orderId: parsed.data.orderId });
  if (!order) return error("Order not found", 404);

  if (parsed.data.mode === "manual") {
    const nextAwb = typeof parsed.data.awbCode === "string" ? parsed.data.awbCode.trim() : order.awbCode || "";
    const nextCourier = typeof parsed.data.courierName === "string" ? parsed.data.courierName.trim() : order.courierName || "";
    const nextTrackingUrl = typeof parsed.data.trackingUrl === "string" ? parsed.data.trackingUrl.trim() : order.trackingUrl || "";
    const nextDeliveryStatus = parsed.data.deliveryStatus ?? order.deliveryStatus;

    const updatePayload: Record<string, unknown> = {
      awbCode: nextAwb,
      courierName: nextCourier,
      trackingUrl: isMockAWB(nextAwb) ? "" : nextTrackingUrl,
      deliveryStatus: nextDeliveryStatus,
    };

    if (nextDeliveryStatus !== order.deliveryStatus) {
      updatePayload.trackingEvents = [
        {
          status: nextDeliveryStatus,
          activity: `Status updated manually to ${nextDeliveryStatus.replaceAll("_", " ")}`,
          location: "Admin panel",
          eventTime: new Date(),
        },
        ...(Array.isArray(order.trackingEvents) ? order.trackingEvents : []),
      ].slice(0, 30);
    }

    const updated = await Order.findOneAndUpdate(
      { _id: order._id },
      {
        $set: updatePayload,
      },
      { returnDocument: "after" }
    ).lean();
    return json({ ok: true, item: updated });
  }

  const awbCode = order.awbCode || "";
  if (!awbCode) return error("AWB not found for this order", 400);

  const shipping = getShippingProvider();
  const tracking = await shipping.trackShipment({ awbCode });
  const mappedEvents = (tracking.events ?? []).map((event) => ({
    status: event.status || "",
    activity: event.description || event.activity || "",
    location: event.location || "",
    eventTime: event.eventTime ? new Date(event.eventTime) : new Date(),
  }));

  const updated = await Order.findOneAndUpdate(
    { _id: order._id },
    {
      $set: {
        trackingUrl: isMockAWB(awbCode) ? "" : tracking.trackingUrl || order.trackingUrl || `https://shiprocket.co/tracking/${encodeURIComponent(awbCode)}`,
        courierName: tracking.courierName || order.courierName,
        deliveryStatus: normalizeDeliveryStatus(tracking.currentStatus || tracking.status) ?? order.deliveryStatus,
        trackingEvents: mappedEvents.length > 0 ? mappedEvents : order.trackingEvents ?? [],
        lastTrackingSyncAt: new Date(),
      },
    },
    { returnDocument: "after" }
  ).lean();

  return json({ ok: true, item: updated });
}

