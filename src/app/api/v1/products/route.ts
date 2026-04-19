import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/lib/db/models/Product.model";
import { Category } from "@/lib/db/models/Category.model";
import { Brand } from "@/lib/db/models/Brand.model";
import { error, json } from "@/lib/api/response";
import { z } from "zod";

const QuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  inStock: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) return error("Invalid query", 400, parsed.error.flatten());

  const { q, category, brand, inStock, page, limit } = parsed.data;

  await connectDB();

  const filter: Record<string, unknown> = { isActive: true };

  if (q) filter.$text = { $search: q };

  if (category) {
    const cat = await Category.findOne({ slug: category }).select("_id").lean();
    if (!cat) return json({ items: [], page, limit, total: 0 });
    filter.category = cat._id;
  }

  if (brand) {
    const b = await Brand.findOne({ slug: brand }).select("_id").lean();
    if (!b) return json({ items: [], page, limit, total: 0 });
    filter.brand = b._id;
  }

  if (inStock === "true") filter.stock = { $gt: 0 };
  if (inStock === "false") filter.stock = { $lte: 0 };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("name slug partNumber images basePrice costPrice salePrice isOnSale stock averageRating reviewCount")
      .lean(),
    Product.countDocuments(filter),
  ]);

  return json({ items, page, limit, total });
}

