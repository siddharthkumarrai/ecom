import mongoose from "mongoose";
import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/lib/db/models/Product.model";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { deleteCloudinaryAssetByUrl } from "@/lib/media/cloudinary";
import { sanitizeRichHtml } from "@/lib/content/sanitizeRichHtml";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  partNumber: z.string().min(1).optional(),
  description: z.string().optional(),
  richDescription: z.string().optional(),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  sellingPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  productDeliveryCharge: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isOnSale: z.boolean().optional(),
  salePrice: z.number().min(0).optional(),
  specifications: z
    .array(
      z.object({
        key: z.string().trim().min(1),
        value: z.string().trim().min(1),
      })
    )
    .optional(),
  technicalDocuments: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        url: z.string().trim().url(),
      })
    )
    .optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return error("Invalid product id", 400);

  await connectDB();
  const item = await Product.findById(id).lean();
  if (!item) return error("Product not found", 404);
  return json({ item });
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return error("Invalid product id", 400);

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  const existing = await Product.findById(id).select("images").lean<{ images?: string[] } | null>();
  if (!existing) return error("Product not found", 404);
  const updatePayload: Record<string, unknown> = { ...parsed.data };
  if (typeof parsed.data.richDescription === "string") {
    updatePayload.richDescription = sanitizeRichHtml(parsed.data.richDescription);
  }
  if (Array.isArray(parsed.data.imageUrls)) {
    updatePayload.images = parsed.data.imageUrls.filter(Boolean);
    delete updatePayload.imageUrls;
    delete updatePayload.imageUrl;
  } else if (typeof parsed.data.imageUrl === "string") {
    updatePayload.images = parsed.data.imageUrl ? [parsed.data.imageUrl] : [];
    delete updatePayload.imageUrl;
  }
  if (typeof parsed.data.categoryId === "string") {
    if (!mongoose.isValidObjectId(parsed.data.categoryId)) return error("Invalid category id", 400);
    updatePayload.category = new mongoose.Types.ObjectId(parsed.data.categoryId);
    delete updatePayload.categoryId;
  }
  if (typeof parsed.data.brandId === "string") {
    if (parsed.data.brandId && !mongoose.isValidObjectId(parsed.data.brandId)) return error("Invalid brand id", 400);
    updatePayload.brand = parsed.data.brandId ? new mongoose.Types.ObjectId(parsed.data.brandId) : null;
    delete updatePayload.brandId;
  }
  if (typeof parsed.data.sellingPrice === "number") {
    updatePayload.basePrice = parsed.data.sellingPrice;
    delete updatePayload.sellingPrice;
  }
  const item = await Product.findByIdAndUpdate(id, { $set: updatePayload }, { returnDocument: "after" }).lean();
  if (!item) return error("Product not found", 404);
  const prevImages = existing.images ?? [];
  const nextImages = Array.isArray((item as { images?: string[] }).images) ? (item as { images?: string[] }).images ?? [] : [];
  const removed = prevImages.filter((img) => img && !nextImages.includes(img));
  for (const img of removed) {
    await deleteCloudinaryAssetByUrl(img).catch(() => undefined);
  }
  return json({ item });
}

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return error("Invalid product id", 400);
  await connectDB();
  const existing = await Product.findById(id).select("images").lean<{ images?: string[] } | null>();
  await Product.findByIdAndDelete(id);
  for (const imageUrl of existing?.images ?? []) {
    if (imageUrl) await deleteCloudinaryAssetByUrl(imageUrl).catch(() => undefined);
  }
  return json({ ok: true });
}
