import mongoose, { type InferSchemaType } from "mongoose";

const CartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);

export type CartDoc = InferSchemaType<typeof CartSchema> & { _id: mongoose.Types.ObjectId };

export const Cart = (mongoose.models.Cart as mongoose.Model<CartDoc>) || mongoose.model<CartDoc>("Cart", CartSchema);

