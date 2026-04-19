import mongoose from "mongoose";
import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";
import { Product } from "@/lib/db/models/Product.model";

const BodySchema = z.object({
  productId: z.string().min(1),
});

export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user?._id) return json({ items: [], count: 0, inWishlist: false });
  await connectDB();

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  const dbUser = await User.findById(user._id).select("wishlist").lean<{ wishlist?: Array<mongoose.Types.ObjectId | string> } | null>();
  const wishlistIds = (dbUser?.wishlist ?? []).map((id) => String(id));

  if (productId) {
    return json({ inWishlist: wishlistIds.includes(productId), count: wishlistIds.length });
  }

  const items = wishlistIds.length
    ? await Product.find({ _id: { $in: wishlistIds }, isActive: true })
        .select("name slug partNumber images basePrice costPrice salePrice isOnSale averageRating reviewCount stock")
        .lean()
    : [];

  return json({
    count: wishlistIds.length,
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      slug: item.slug,
      partNumber: item.partNumber,
      image: item.images?.[0] ?? "",
      price: item.isOnSale && typeof item.salePrice === "number" ? item.salePrice : item.basePrice,
      sellingPrice: item.isOnSale && typeof item.salePrice === "number" ? item.salePrice : item.basePrice,
      costPrice: typeof item.costPrice === "number" ? item.costPrice : undefined,
      rating: item.averageRating ?? 0,
      reviewCount: item.reviewCount ?? 0,
      stock: item.stock ?? 0,
    })),
  });
}

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());
  if (!mongoose.isValidObjectId(parsed.data.productId)) return error("Invalid product id", 400);

  await connectDB();
  await User.updateOne({ _id: user._id }, { $addToSet: { wishlist: new mongoose.Types.ObjectId(parsed.data.productId) } });
  const dbUser = await User.findById(user._id).select("wishlist").lean<{ wishlist?: Array<mongoose.Types.ObjectId | string> } | null>();
  const count = dbUser?.wishlist?.length ?? 0;
  return json({ ok: true, inWishlist: true, count });
}

export async function DELETE(req: Request) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());
  if (!mongoose.isValidObjectId(parsed.data.productId)) return error("Invalid product id", 400);

  await connectDB();
  await User.updateOne({ _id: user._id }, { $pull: { wishlist: new mongoose.Types.ObjectId(parsed.data.productId) } });
  const dbUser = await User.findById(user._id).select("wishlist").lean<{ wishlist?: Array<mongoose.Types.ObjectId | string> } | null>();
  const count = dbUser?.wishlist?.length ?? 0;
  return json({ ok: true, inWishlist: false, count });
}
