import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/lib/db/models/Product.model";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { deleteCloudinaryAssetByUrl } from "@/lib/media/cloudinary";
import { sanitizeRichHtml } from "@/lib/content/sanitizeRichHtml";

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  sku: z.string().min(1),
  partNumber: z.string().min(1),
  description: z.string().optional().default(""),
  richDescription: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  imageUrls: z.array(z.string()).optional(),
  categoryId: z.string().min(1),
  brandId: z.string().optional(),
  sellingPrice: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  productDeliveryCharge: z.number().min(0).optional().default(0),
  stock: z.number().int().min(0).default(0),
  specifications: z
    .array(
      z.object({
        key: z.string().trim().min(1),
        value: z.string().trim().min(1),
      })
    )
    .optional()
    .default([]),
  technicalDocuments: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        url: z.string().trim().url(),
      })
    )
    .optional()
    .default([]),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const idsRaw = searchParams.get("ids")?.trim() ?? "";
  const ids = idsRaw
    ? idsRaw.split(/[,\n]+/).map((id) => id.trim()).filter(Boolean)
    : [];
  const categoryId = searchParams.get("categoryId")?.trim() ?? "";
  const limitParam = searchParams.get("limit");
  const requestedLimit = limitParam ? Number(limitParam) : Number.NaN;
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(500, Math.trunc(requestedLimit)))
    : 200;

  if (ids.length) {
    const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
    if (!validIds.length) return json({ items: [] });

    await connectDB();
    const items = await Product.find({ _id: { $in: validIds } }).limit(Math.min(limit, validIds.length)).lean();
    const byId = new Map(items.map((item) => [String(item._id), item]));
    const ordered = validIds.map((id) => byId.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
    return json({ items: ordered });
  }

  const findQuery: Record<string, unknown> = {};
  if (categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) return json({ items: [] });
    findQuery.category = new mongoose.Types.ObjectId(categoryId);
  }
  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    findQuery.$or = [
      { name: regex },
      { partNumber: regex },
      { slug: regex },
      { sku: regex },
    ];
  }

  await connectDB();
  const items = await Product.find(findQuery).sort({ createdAt: -1 }).limit(limit).lean();
  return json({ items });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());
  if (!mongoose.isValidObjectId(parsed.data.categoryId)) return error("Invalid category id", 400);
  if (parsed.data.brandId && !mongoose.isValidObjectId(parsed.data.brandId)) return error("Invalid brand id", 400);

  await connectDB();
  const resolvedSlug = slugify(parsed.data.slug?.trim() || parsed.data.name);
  if (!resolvedSlug) return error("Slug could not be generated. Please provide a valid product name or slug.", 400);

  try {
    const created = await Product.create({
      name: parsed.data.name,
      slug: resolvedSlug,
      sku: parsed.data.sku,
      partNumber: parsed.data.partNumber,
      description: parsed.data.description,
      richDescription: sanitizeRichHtml(parsed.data.richDescription ?? ""),
      images:
        parsed.data.imageUrls?.length
          ? parsed.data.imageUrls.filter(Boolean)
          : parsed.data.imageUrl
            ? [parsed.data.imageUrl]
            : [],
      category: new mongoose.Types.ObjectId(parsed.data.categoryId),
      brand: parsed.data.brandId ? new mongoose.Types.ObjectId(parsed.data.brandId) : null,
      basePrice: parsed.data.sellingPrice,
      costPrice: parsed.data.costPrice ?? null,
      productDeliveryCharge: parsed.data.productDeliveryCharge ?? 0,
      stock: parsed.data.stock,
      specifications: parsed.data.specifications,
      technicalDocuments: parsed.data.technicalDocuments,
      isActive: true,
    });
    return json({ item: created }, { status: 201 });
  } catch (e) {
    const maybeMongo = e as { code?: number; keyPattern?: Record<string, unknown> };
    if (maybeMongo?.code === 11000) {
      if (maybeMongo?.keyPattern?.slug) return error("Slug already exists. Please use another slug.", 400);
      if (maybeMongo?.keyPattern?.sku) return error("SKU already exists. Please use another SKU.", 400);
      return error("Duplicate product data found. Please check slug and SKU.", 400);
    }
    return error("Failed to create product", 500);
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const body = await req.json().catch(() => null);
  const imageUrl = typeof (body as { imageUrl?: unknown })?.imageUrl === "string" ? String((body as { imageUrl?: string }).imageUrl) : "";
  if (!imageUrl) return error("imageUrl is required", 400);

  try {
    await deleteCloudinaryAssetByUrl(imageUrl);
    return json({ ok: true });
  } catch {
    return json({ ok: true });
  }
}
