import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";

const StatusSchema = z
  .object({
    deliveryStatus: z.enum(["pending", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"]).optional(),
    trackingEvent: z
      .object({
        status: z.string().min(1),
        description: z.string().min(1),
        location: z.string().optional(),
      })
      .optional(),
  })
  .refine((value) => !!value.deliveryStatus || !!value.trackingEvent, {
    message: "deliveryStatus or trackingEvent is required",
  });

interface Params {
  params: Promise<{ orderId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const body = await req.json().catch(() => null);
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  const { orderId } = await params;
  await connectDB();
  const order = await Order.findOne({ orderId });
  if (!order) return error("Order not found", 404);

  const updateData: Record<string, unknown> = {};
  if (parsed.data.deliveryStatus) {
    updateData.deliveryStatus = parsed.data.deliveryStatus;
  }

  if (parsed.data.trackingEvent) {
    updateData.trackingEvents = [
      {
        status: parsed.data.trackingEvent.status.trim(),
        activity: parsed.data.trackingEvent.description.trim(),
        location: parsed.data.trackingEvent.location?.trim() || "",
        eventTime: new Date(),
      },
      ...(Array.isArray(order.trackingEvents) ? order.trackingEvents : []),
    ].slice(0, 40);
  } else if (parsed.data.deliveryStatus) {
    updateData.trackingEvents = [
      {
        status: parsed.data.deliveryStatus,
        activity: `Status updated to ${parsed.data.deliveryStatus.replaceAll("_", " ")}`,
        location: "Admin panel",
        eventTime: new Date(),
      },
      ...(Array.isArray(order.trackingEvents) ? order.trackingEvents : []),
    ].slice(0, 40);
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id },
    {
      $set: updateData,
    },
    { returnDocument: "after" }
  ).lean();

  return json({ ok: true, order: updated });
}

