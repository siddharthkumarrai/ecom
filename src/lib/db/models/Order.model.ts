import mongoose, { type InferSchemaType } from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    line1: { type: String, default: "" },
    line2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" },
  },
  { _id: false }
);

const OrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, default: "" },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    isCODItem: { type: Boolean, default: true },
    hsnCode: { type: String, default: "" },
  },
  { _id: false }
);

const TrackingEventSchema = new mongoose.Schema(
  {
    status: { type: String, default: "" },
    activity: { type: String, default: "" },
    location: { type: String, default: "" },
    eventTime: { type: Date },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [OrderItemSchema],

    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    shippingCharge: { type: Number, required: true },
    codCharge: { type: Number, required: true },
    discount: { type: Number, required: true },
    couponCode: { type: String },
    totalAmount: { type: Number, required: true },

    shippingAddress: { type: AddressSchema, required: true },
    billingAddress: { type: AddressSchema, required: true },

    paymentMethod: { type: String, enum: ["razorpay", "cod", "bank_transfer"], required: true, index: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "abandoned", "refunded", "partial_refund"],
      default: "pending",
      index: true,
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    deliveryStatus: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"],
      default: "pending",
      index: true,
    },
    shiprocketOrderId: { type: String },
    shiprocketShipmentId: { type: String },
    awbCode: { type: String },
    trackingUrl: { type: String },
    courierName: { type: String },
    trackingEvents: { type: [TrackingEventSchema], default: [] },

    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    fraudScore: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false, index: true },

    notes: { type: String },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof OrderSchema> & { _id: mongoose.Types.ObjectId };

export const Order = (mongoose.models.Order as mongoose.Model<OrderDoc>) || mongoose.model<OrderDoc>("Order", OrderSchema);

