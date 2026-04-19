import mongoose from "mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { Product } from "@/lib/db/models/Product.model";
import { Cart } from "@/lib/db/models/Cart.model";

type FinalizeInput = {
  orderQuery: { orderId?: string; razorpayOrderId?: string; userId?: string };
  paymentMeta: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature?: string };
  clearCartForUserId?: mongoose.Types.ObjectId | string;
};

export async function finalizePaidOrder(input: FinalizeInput) {
  const match: Record<string, unknown> = {};
  if (input.orderQuery.orderId) match.orderId = input.orderQuery.orderId;
  if (input.orderQuery.razorpayOrderId) match.razorpayOrderId = input.orderQuery.razorpayOrderId;
  if (input.orderQuery.userId) match.user = input.orderQuery.userId;

  const order = await Order.findOne(match).lean();
  if (!order) return { ok: false as const, reason: "ORDER_NOT_FOUND" as const };
  if (order.paymentStatus === "paid") return { ok: true as const, alreadyFinalized: true as const };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of order.items ?? []) {
        const res = await Product.updateOne(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session }
        );
        if (res.modifiedCount !== 1) throw new Error("INSUFFICIENT_STOCK");
      }

      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentStatus: "paid",
            // Delivery status should be confirmed only when admin confirms/books shipment.
            deliveryStatus: order.deliveryStatus ?? "pending",
            razorpayOrderId: input.paymentMeta.razorpayOrderId,
            razorpayPaymentId: input.paymentMeta.razorpayPaymentId,
            ...(input.paymentMeta.razorpaySignature ? { razorpaySignature: input.paymentMeta.razorpaySignature } : {}),
          },
        },
        { session }
      );

      const clearUserId = input.clearCartForUserId ?? order.user;
      if (clearUserId) {
        await Cart.updateOne({ user: clearUserId }, { $set: { items: [] } }, { session });
      }
    });
  } finally {
    session.endSession();
  }

  return { ok: true as const, alreadyFinalized: false as const };
}
