import mongoose, { type InferSchemaType } from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { timestamps: true }
);

CategorySchema.index({ parent: 1, order: 1 });
CategorySchema.index({ name: "text", slug: "text" });

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & { _id: mongoose.Types.ObjectId };

export const Category =
  (mongoose.models.Category as mongoose.Model<CategoryDoc>) || mongoose.model<CategoryDoc>("Category", CategorySchema);

