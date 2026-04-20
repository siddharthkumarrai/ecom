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
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    role: { type: String, enum: ["customer", "admin", "sales", "super_admin"], default: "customer", index: true },
    addresses: [AddressSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    salesCode: { type: String, default: "", index: true },
    totalSpend: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const User = (mongoose.models.User as mongoose.Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);
