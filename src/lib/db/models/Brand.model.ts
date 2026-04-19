import mongoose, { type InferSchemaType } from "mongoose";

const BrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    logo: { type: String, default: "" },
    description: { type: String, default: "" },
    website: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

BrandSchema.index({ name: "text", slug: "text" });

export type BrandDoc = InferSchemaType<typeof BrandSchema> & { _id: mongoose.Types.ObjectId };

export const Brand =
  (mongoose.models.Brand as mongoose.Model<BrandDoc>) || mongoose.model<BrandDoc>("Brand", BrandSchema);

