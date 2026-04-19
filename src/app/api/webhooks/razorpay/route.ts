import crypto from "crypto";
import { headers } from "next/headers";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { getShippingProvider } from "@/lib/providers/shipping/ShiprocketProvider";
import { finalizePaidOrder } from "@/lib/orders/finalizePaidOrder";

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { order_id?: string; id?: string } };
    refund?: { entity?: { payment_id?: string } };
  };
};

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("Missing RAZORPAY_WEBHOOK_SECRET", { status: 500 });

  const body = await req.text();
  const h = await headers();
  const signature = h.get("x-razorpay-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signature);
  if (expectedBuf.length !== givenBuf.length || !crypto.timingSafeEqual(expectedBuf, givenBuf)) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body) as RazorpayWebhookEvent;
  await connectDB();

  if (event.event === "payment.captured") {
    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;
    if (orderId) {
      const finalized = await finalizePaidOrder({
        orderQuery: { razorpayOrderId: orderId },
        paymentMeta: { razorpayOrderId: orderId, razorpayPaymentId: paymentId ?? "" },
      });

      const updatedOrder = finalized.ok ? await Order.findOne({ razorpayOrderId: orderId }) : null;

      // Best-effort shipment creation after successful payment capture
      if (updatedOrder && !updatedOrder.shiprocketShipmentId) {
        try {
          const shipping = getShippingProvider();
          const shipment = await shipping.createShipment({
            orderId: updatedOrder.orderId,
            createdAt: updatedOrder.createdAt,
            shippingAddress: {
              name: updatedOrder.shippingAddress.name,
              line1: updatedOrder.shippingAddress.line1,
              city: updatedOrder.shippingAddress.city,
              pincode: updatedOrder.shippingAddress.pincode,
              state: updatedOrder.shippingAddress.state,
              phone: updatedOrder.shippingAddress.phone,
            },
            items: updatedOrder.items.map((item) => ({
              name: item.name,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              hsnCode: item.hsnCode,
            })),
            paymentMethod: updatedOrder.paymentMethod === "cod" ? "cod" : "prepaid",
            totalAmount: updatedOrder.totalAmount,
          });

          await Order.updateOne(
            { _id: updatedOrder._id },
            {
              shiprocketShipmentId: shipment.shipmentId,
              awbCode: shipment.awbCode,
              deliveryStatus: "processing",
            }
          );
        } catch {
          // Keep webhook resilient even if shipping provider fails.
        }
      }
    }
  }

  if (event.event === "payment.failed") {
    const orderId = event.payload?.payment?.entity?.order_id;
    if (orderId) await Order.findOneAndUpdate({ razorpayOrderId: orderId }, { paymentStatus: "abandoned" });
  }

  if (event.event === "refund.processed") {
    const paymentId = event.payload?.refund?.entity?.payment_id;
    if (paymentId) await Order.findOneAndUpdate({ razorpayPaymentId: paymentId }, { paymentStatus: "refunded" });
  }

  return new Response("OK", { status: 200 });
}

