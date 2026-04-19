import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";

const Schema = z.object({ orderId: z.string().min(1) });

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  await Order.updateOne(
    { orderId: parsed.data.orderId, user: user._id, paymentMethod: "razorpay", paymentStatus: "pending" },
    { $set: { paymentStatus: "abandoned" } }
  );
  return json({ ok: true });
}
