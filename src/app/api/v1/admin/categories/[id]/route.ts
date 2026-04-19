import mongoose from "mongoose";
import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { connectDB } from "@/lib/db/mongoose";
import { Category } from "@/lib/db/models/Category.model";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return error("Invalid category id", 400);

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  try {
    const item = await Category.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean();
    if (!item) return error("Category not found", 404);
    return json({ item });
  } catch (e) {
    const maybeMongo = e as { code?: number; keyPattern?: Record<string, unknown> };
    if (maybeMongo?.code === 11000 && maybeMongo?.keyPattern?.slug) return error("Category slug already exists", 400);
    return error("Failed to update category", 500);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return error("Invalid category id", 400);

  await connectDB();
  await Category.findByIdAndDelete(id);
  return json({ ok: true });
}
