import { z } from "zod";
import mongoose from "mongoose";
import { error, json } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Cart } from "@/lib/db/models/Cart.model";
import { Order } from "@/lib/db/models/Order.model";
import { Product } from "@/lib/db/models/Product.model";
import { User } from "@/lib/db/models/User.model";
import { SiteConfig } from "@/lib/db/models/SiteConfig.model";
import { generateOrderId } from "@/lib/orders/orderId";
import { getPaymentProvider } from "@/lib/providers/payment/RazorpayProvider";
import { computeCartTotals } from "@/lib/cart/pricing";

const AddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  line1: z.string().min(1),
  line2: z.string().optional().default(""),
  city: z.string().min(1),
  state: z.string().min(1).default(""),
  pincode: z.string().min(4),
  country: z.string().default("India"),
});

const CreateSchema = z.object({
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
  paymentMethod: z.enum(["razorpay", "cod", "bank_transfer"]),
  couponCode: z.string().optional(),
});

export async function GET() {
  const { user } = await requireUser();
  if (!user) return error("Unauthorized", 401);

  await connectDB();
  const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(50).lean();
  return json({ orders });
}

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  const cart = await Cart.findOne({ user: user._id }).lean();
  if (!cart || cart.items.length === 0) return error("Cart is empty", 400);

  const config = await SiteConfig.findOne({ key: "main" }).lean();
  const shippingCfg = config?.shipping;

  // Load products and validate stock/prices server-side
  const productIds = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true })
    .select("name sku images stock minOrderQty maxOrderQty basePrice salePrice isOnSale isCODEnabled isPrepaidOnly hsnCode productDeliveryCharge")
    .lean();
  const productById = new Map(products.map((p) => [String(p._id), p]));

  let subtotal = 0;
  const items = cart.items.map((ci) => {
    const p = productById.get(String(ci.product));
    if (!p) throw new Error("PRODUCT_NOT_FOUND");
    const qty = ci.quantity;
    if (qty < (p.minOrderQty ?? 1) || qty > (p.maxOrderQty ?? 10000)) throw new Error("INVALID_QTY");
    if ((p.stock ?? 0) < qty) throw new Error("INSUFFICIENT_STOCK");

    const unit = p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice;
    const total = unit * qty;
    subtotal += total;
    return {
      product: ci.product,
      name: p.name,
      sku: p.sku,
      image: p.images?.[0] ?? "",
      quantity: qty,
      unitPrice: unit,
      totalPrice: total,
      isCODItem: !!p.isCODEnabled,
      hsnCode: p.hsnCode ?? "",
    };
  });

  // Payment method validations (COD restrictions)
  if (parsed.data.paymentMethod === "cod") {
    const isCODGloballyEnabled = shippingCfg?.isCODGloballyEnabled ?? true;
    if (!isCODGloballyEnabled) return error("COD is disabled", 400);

    const min = shippingCfg?.codMinimumOrder ?? 100;
    const max = shippingCfg?.codMaximumOrder ?? 5000;
    if (subtotal < min || subtotal > max) return error("COD not allowed for this order value", 400);

    const hasPrepaidOnly = products.some((p) => !!p.isPrepaidOnly);
    if (hasPrepaidOnly) return error("Some items are prepaid-only", 400);

    const anyCODDisabled = products.some((p) => !p.isCODEnabled);
    if (anyCODDisabled) return error("Some items are not eligible for COD", 400);
  }

  const codCharge = parsed.data.paymentMethod === "cod" ? shippingCfg?.codCharge ?? 30 : 0;
  const cartTotals = await computeCartTotals(cart.items, parsed.data.couponCode, user._id);
  const shippingCharge = cartTotals.shippingCharge ?? 0;
  const taxAmount = cartTotals.taxAmount ?? 0;
  const discountAmount = cartTotals.discountAmount ?? 0;
  const appliedCouponCode = cartTotals.appliedCouponCode ?? "";

  const totalAmount = round2(subtotal + taxAmount + shippingCharge + codCharge - discountAmount);
  const generatedOrderId = generateOrderId();
  let razorpayOrderId = "";

  if (parsed.data.paymentMethod === "razorpay") {
    const provider = getPaymentProvider();
    const providerOrder = await provider.createOrder({
      amount: totalAmount,
      currency: "INR",
      orderId: generatedOrderId,
      customerEmail: user.email ?? "",
      customerPhone: parsed.data.shippingAddress.phone,
      customerName: parsed.data.shippingAddress.name,
    });
    razorpayOrderId = providerOrder.providerOrderId;
  }

  try {
    const shippingAddress = parsed.data.shippingAddress;
    await User.updateOne(
      { _id: user._id },
      {
        $addToSet: {
          addresses: {
            name: shippingAddress.name,
            phone: shippingAddress.phone,
            line1: shippingAddress.line1,
            line2: shippingAddress.line2 ?? "",
            city: shippingAddress.city,
            state: shippingAddress.state ?? "",
            pincode: shippingAddress.pincode,
            country: shippingAddress.country ?? "India",
            isDefault: false,
          },
        },
      }
    );

    if (parsed.data.paymentMethod === "razorpay") {
      await Order.create({
        orderId: generatedOrderId,
        user: user._id,
        items,
        subtotal: round2(subtotal),
        taxAmount: round2(taxAmount),
        shippingCharge: round2(shippingCharge),
        codCharge: round2(codCharge),
        discount: round2(discountAmount),
        couponCode: appliedCouponCode || undefined,
        totalAmount,
        shippingAddress: parsed.data.shippingAddress,
        billingAddress: parsed.data.billingAddress ?? parsed.data.shippingAddress,
        paymentMethod: parsed.data.paymentMethod,
        paymentStatus: "pending",
        deliveryStatus: "pending",
        razorpayOrderId: razorpayOrderId || undefined,
        ipAddress: "",
        userAgent: "",
        fraudScore: 0,
        isFlagged: false,
      });
    } else {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const ci of cart.items) {
            const res = await Product.updateOne(
              { _id: ci.product, stock: { $gte: ci.quantity } },
              { $inc: { stock: -ci.quantity } },
              { session }
            );
            if (res.modifiedCount !== 1) throw new Error("STOCK_RACE");
          }

          await Order.create(
            [
              {
                orderId: generatedOrderId,
                user: user._id,
                items,
                subtotal: round2(subtotal),
                taxAmount: round2(taxAmount),
                shippingCharge: round2(shippingCharge),
                codCharge: round2(codCharge),
                discount: round2(discountAmount),
                couponCode: appliedCouponCode || undefined,
                totalAmount,
                shippingAddress: parsed.data.shippingAddress,
                billingAddress: parsed.data.billingAddress ?? parsed.data.shippingAddress,
                paymentMethod: parsed.data.paymentMethod,
                paymentStatus: parsed.data.paymentMethod === "cod" ? "pending" : "paid",
                deliveryStatus: "pending",
                ipAddress: "",
                userAgent: "",
                fraudScore: 0,
                isFlagged: false,
              },
            ],
            { session }
          );
          await Cart.updateOne({ user: user._id }, { $set: { items: [] } }, { session });
        });
      } finally {
        session.endSession();
      }
    }
  } catch (e) {
    return error("Order failed", 400, String(e));
  }

  return json({ ok: true, orderId: generatedOrderId, payment: parsed.data.paymentMethod === "razorpay" ? { provider: "razorpay", razorpayOrderId } : null });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

