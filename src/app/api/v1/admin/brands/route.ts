import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { connectDB } from "@/lib/db/mongoose";
import { Brand } from "@/lib/db/models/Brand.model";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().default(""),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  await connectDB();
  const items = await Brand.find().sort({ createdAt: -1 }).lean();
  return json({ items });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  const item = await Brand.create({ ...parsed.data, isActive: true });
  return json({ item }, { status: 201 });
}

