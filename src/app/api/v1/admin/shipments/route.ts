import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { getShippingProvider } from "@/lib/providers/shipping/ShiprocketProvider";

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
  if (order.shiprocketShipmentId) return json({ ok: true, item: order });
  if (!(order.paymentStatus === "paid" || order.paymentMethod === "cod")) return error("Order payment not completed for shipment", 400);

  let shipment: { shipmentId: string; awbCode: string };
  const shipping = getShippingProvider();
  try {
    shipment = await shipping.createShipment({
      orderId: order.orderId,
      createdAt: order.createdAt,
      shippingAddress: {
        name: order.shippingAddress.name,
        line1: order.shippingAddress.line1,
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
      })),
      paymentMethod: order.paymentMethod === "cod" ? "cod" : "prepaid",
      totalAmount: order.totalAmount,
    });
  } catch (e) {
    return error("Failed to create shipment", 400, String(e));
  }

  let trackingUrl = order.trackingUrl || "";
  let courierName = order.courierName || "";
  // Booking shipment is the admin "confirm" action.
  let normalizedDeliveryStatus: string | null = "confirmed";
  if (shipment.awbCode) {
    try {
      const tracking = await shipping.trackShipment({ awbCode: shipment.awbCode });
      trackingUrl = tracking.trackingUrl || trackingUrl;
      courierName = tracking.courierName || courierName;
      normalizedDeliveryStatus = normalizeDeliveryStatus(tracking.status) ?? normalizedDeliveryStatus;
    } catch {
      // Shipment may need provider processing delay before first track call.
    }
  }
  const updated = await Order.findOneAndUpdate(
    { _id: order._id },
    {
      $set: {
        shiprocketShipmentId: shipment.shipmentId,
        awbCode: shipment.awbCode,
        trackingUrl,
        courierName,
        deliveryStatus: normalizedDeliveryStatus ?? "confirmed",
        trackingEvents: trackingUrl
          ? [
              {
                status: normalizedDeliveryStatus ?? "confirmed",
                activity: "Shipment booked by admin",
                location: "",
                eventTime: new Date(),
              },
            ]
          : order.trackingEvents ?? [],
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
    const nextAwb = String(parsed.data.awbCode ?? order.awbCode ?? "");
    const nextCourier = String(parsed.data.courierName ?? order.courierName ?? "");
    const nextTrackingUrl = String(parsed.data.trackingUrl ?? order.trackingUrl ?? "");
    const nextDeliveryStatus = parsed.data.deliveryStatus ?? order.deliveryStatus;
    const updated = await Order.findOneAndUpdate(
      { _id: order._id },
      {
        $set: {
          awbCode: nextAwb,
          courierName: nextCourier,
          trackingUrl: nextTrackingUrl,
          deliveryStatus: nextDeliveryStatus,
          trackingEvents: [
            {
              status: nextDeliveryStatus,
              activity: "Updated manually by admin",
              location: "",
              eventTime: new Date(),
            },
            ...(Array.isArray(order.trackingEvents) ? order.trackingEvents : []),
          ].slice(0, 20),
        },
      },
      { returnDocument: "after" }
    ).lean();
    return json({ ok: true, item: updated });
  }
  if (!(order.paymentStatus === "paid" || order.paymentMethod === "cod")) return error("Order payment not completed for shipment", 400);

  let awbCode = order.awbCode || "";
  let shiprocketShipmentId = order.shiprocketShipmentId || "";
  if (!awbCode && !shiprocketShipmentId) {
    let shipment: { shipmentId: string; awbCode: string };
    try {
      shipment = await getShippingProvider().createShipment({
        orderId: order.orderId,
        createdAt: order.createdAt,
        shippingAddress: {
          name: order.shippingAddress.name,
          line1: order.shippingAddress.line1,
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
        })),
        paymentMethod: order.paymentMethod === "cod" ? "cod" : "prepaid",
        totalAmount: order.totalAmount,
      });
    } catch (e) {
      return error("Failed to create shipment", 400, String(e));
    }
    awbCode = shipment.awbCode ?? "";
    shiprocketShipmentId = shipment.shipmentId ?? "";
  }
  if (!awbCode) return error("AWB not found for this order", 400);

  const shipping = getShippingProvider();
  let tracking: {
    trackingUrl: string;
    courierName: string;
    status: string;
    events: Array<{ status: string; activity: string; location: string; eventTime?: string }>;
  };
  try {
    tracking = await shipping.trackShipment({ awbCode });
  } catch (e) {
    return error("Failed to track shipment", 400, String(e));
  }
  const updated = await Order.findOneAndUpdate(
    { _id: order._id },
    {
      $set: {
        shiprocketShipmentId: shiprocketShipmentId || order.shiprocketShipmentId,
        awbCode,
        trackingUrl: tracking.trackingUrl || order.trackingUrl,
        courierName: tracking.courierName || order.courierName,
        deliveryStatus: normalizeDeliveryStatus(tracking.status) ?? order.deliveryStatus,
        trackingEvents: (tracking.events ?? []).map((event) => ({
          status: normalizeDeliveryStatus(event.status || event.activity || "") ?? order.deliveryStatus,
          activity: event.activity || event.status || "",
          location: event.location || "",
          eventTime: event.eventTime ? new Date(event.eventTime) : undefined,
        })),
      },
    },
    { returnDocument: "after" }
  ).lean();

  return json({ ok: true, item: updated });
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
