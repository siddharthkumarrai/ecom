import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { connectDB } from "@/lib/db/mongoose";
import { Category } from "@/lib/db/models/Category.model";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  image: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  await connectDB();
  const items = await Category.find().sort({ order: 1, createdAt: -1 }).lean();
  return json({ items });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  try {
    const item = await Category.create({
      ...parsed.data,
      image: parsed.data.image.trim(),
      isActive: true,
    });
    return json({ item }, { status: 201 });
  } catch (e) {
    const maybeMongo = e as { code?: number; keyPattern?: Record<string, unknown> };
    if (maybeMongo?.code === 11000 && maybeMongo?.keyPattern?.slug) return error("Category slug already exists", 400);
    return error("Failed to create category", 500);
  }
}
