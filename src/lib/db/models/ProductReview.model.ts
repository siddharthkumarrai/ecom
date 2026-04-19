import mongoose, { type InferSchemaType } from "mongoose";

const ProductReviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    comment: { type: String, default: "" },
    isVerifiedPurchase: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductReviewSchema.index({ product: 1, user: 1 }, { unique: true });
ProductReviewSchema.index({ createdAt: -1 });

export type ProductReviewDoc = InferSchemaType<typeof ProductReviewSchema> & { _id: mongoose.Types.ObjectId };

export const ProductReview =
  (mongoose.models.ProductReview as mongoose.Model<ProductReviewDoc>) ||
  mongoose.model<ProductReviewDoc>("ProductReview", ProductReviewSchema);
