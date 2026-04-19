import Razorpay from "razorpay";
import crypto from "crypto";
import type { CreateOrderParams, IPaymentProvider, PaymentVerifyParams } from "@/lib/providers/payment/PaymentProvider.interface";

export class RazorpayProvider implements IPaymentProvider {
  private client: Razorpay;

  constructor() {
    this.client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID ?? "",
      key_secret: process.env.RAZORPAY_KEY_SECRET ?? "",
    });
  }

  async createOrder(params: CreateOrderParams) {
    const order = await this.client.orders.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency || "INR",
      receipt: params.orderId,
      notes: {
        orderId: params.orderId,
        customerEmail: params.customerEmail,
      },
    });
    return { providerOrderId: order.id, amount: Number(order.amount), currency: order.currency };
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<boolean> {
    const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
    const body = `${params.orderId}|${params.paymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const expectedBuf = Buffer.from(expected);
    const givenBuf = Buffer.from(params.signature);
    if (expectedBuf.length !== givenBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, givenBuf);
  }
}

export function getPaymentProvider(): IPaymentProvider {
  return new RazorpayProvider();
}

