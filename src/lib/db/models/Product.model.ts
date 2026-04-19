import mongoose, { type InferSchemaType } from "mongoose";

const PricingTierSchema = new mongoose.Schema(
  {
    minQty: { type: Number, required: true },
    maxQty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    sku: { type: String, required: true, unique: true, index: true },
    partNumber: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    richDescription: { type: String, default: "" },
    images: [{ type: String }],
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: false, default: null, index: true },
    tags: [{ type: String, index: true }],

    // Internal transactional price used for order/cart computations.
    basePrice: { type: Number, required: true },
    // Optional MRP/cost price for strikethrough display on storefront.
    costPrice: { type: Number, default: null },
    pricingTiers: [PricingTierSchema],

    stock: { type: Number, default: 0, index: true },
    minOrderQty: { type: Number, default: 1 },
    maxOrderQty: { type: Number, default: 10000 },

    isCODEnabled: { type: Boolean, default: true },
    isPrepaidOnly: { type: Boolean, default: false },
    isDigital: { type: Boolean, default: false },
    weight: { type: Number, default: 0 },
    productDeliveryCharge: { type: Number, default: 0 },
    dimensions: { l: Number, w: Number, h: Number },
    hsnCode: { type: String, default: "" },

    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isOnSale: { type: Boolean, default: false, index: true },
    salePrice: { type: Number },

    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },

    specifications: [{ key: String, value: String }],
    technicalDocuments: [{ name: String, url: String }],

    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text", partNumber: "text", tags: "text" });
ProductSchema.index({ category: 1, isActive: 1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema> & { _id: mongoose.Types.ObjectId };

export const Product =
  (mongoose.models.Product as mongoose.Model<ProductDoc>) || mongoose.model<ProductDoc>("Product", ProductSchema);

