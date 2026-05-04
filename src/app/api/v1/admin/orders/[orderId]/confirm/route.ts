import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";

const ConfirmSchema = z.object({
  action: z.literal("confirm"),
});

interface Params {
  params: Promise<{ orderId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const body = await req.json().catch(() => null);
  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  const { orderId } = await params;
  await connectDB();
  const order = await Order.findOne({ orderId });
  if (!order) return error("Order not found", 404);

  if (order.paymentStatus !== "paid") {
    return error("Cannot confirm unpaid order", 400);
  }
  if (order.deliveryStatus !== "pending") {
    return error("Order already confirmed", 400);
  }

  const trackingEvents = [
    {
      status: "Order Confirmed",
      activity: "Order confirmed by admin",
      location: "Warehouse",
      eventTime: new Date(),
    },
    ...(Array.isArray(order.trackingEvents) ? order.trackingEvents : []),
  ].slice(0, 30);

  const updated = await Order.findOneAndUpdate(
    { _id: order._id },
    {
      $set: {
        deliveryStatus: "confirmed",
        trackingEvents,
      },
    },
    { returnDocument: "after" }
  ).lean();

  return json({ ok: true, order: updated });
}

