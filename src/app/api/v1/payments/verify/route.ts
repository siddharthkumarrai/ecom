import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { connectDB } from "@/lib/db/mongoose";
import { getPaymentProvider } from "@/lib/providers/payment/RazorpayProvider";
import { requireUser } from "@/lib/auth/requireUser";
import { finalizePaidOrder } from "@/lib/orders/finalizePaidOrder";

const VerifySchema = z.object({
  appOrderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  const provider = getPaymentProvider();
  const isValid = await provider.verifyPayment({
    orderId: parsed.data.razorpayOrderId,
    paymentId: parsed.data.razorpayPaymentId,
    signature: parsed.data.razorpaySignature,
  });
  if (!isValid) return error("Invalid payment signature", 400);

  await connectDB();
  const finalized = await finalizePaidOrder({
    orderQuery: { orderId: parsed.data.appOrderId, userId: String(user._id) },
    paymentMeta: {
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature,
    },
    clearCartForUserId: user._id,
  });
  if (!finalized.ok) return error("Order not found", 404);

  return json({ ok: true });
}

