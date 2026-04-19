import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/lib/db/models/Product.model";
import { ProductReview } from "@/lib/db/models/ProductReview.model";
import { Order } from "@/lib/db/models/Order.model";
import { requireUser } from "@/lib/auth/requireUser";
import { error, json } from "@/lib/api/response";

const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().default(""),
  comment: z.string().max(1200).optional().default(""),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  await connectDB();

  const product = await Product.findOne({ slug, isActive: true }).select("_id averageRating reviewCount").lean();
  if (!product) return error("Product not found", 404);

  const reviews = await ProductReview.find({ product: product._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate("user", "name")
    .lean();

  const { user } = await requireUser();
  let canReview = false;
  if (user?._id) {
    const purchased = await Order.exists({
      user: user._id,
      deliveryStatus: { $in: ["delivered"] },
      "items.product": product._id,
    });
    const alreadyReviewed = await ProductReview.exists({ product: product._id, user: user._id });
    canReview = !!purchased && !alreadyReviewed;
  }

  return json({
    summary: { averageRating: product.averageRating ?? 0, reviewCount: product.reviewCount ?? 0 },
    canReview,
    reviews: reviews.map((review) => ({
      id: String(review._id),
      rating: review.rating,
      title: review.title ?? "",
      comment: review.comment ?? "",
      isVerifiedPurchase: review.isVerifiedPurchase ?? false,
      userName: ((review.user as { name?: string } | null)?.name ?? "Customer").trim() || "Customer",
      createdAt: review.createdAt,
    })),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { user } = await requireUser();
  if (!user?._id) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  const { slug } = await params;
  await connectDB();

  const product = await Product.findOne({ slug, isActive: true }).select("_id").lean();
  if (!product) return error("Product not found", 404);

  const purchased = await Order.exists({
    user: user._id,
    deliveryStatus: { $in: ["delivered"] },
    "items.product": product._id,
  });
  if (!purchased) return error("Only customers who purchased this product can review it.", 403);

  const existing = await ProductReview.exists({ product: product._id, user: user._id });
  if (existing) return error("You already reviewed this product.", 400);

  try {
    await ProductReview.create({
      product: product._id,
      user: user._id,
      rating: parsed.data.rating,
      title: parsed.data.title.trim(),
      comment: parsed.data.comment.trim(),
      isVerifiedPurchase: true,
    });
  } catch {
    return error("Failed to submit review", 500);
  }

  const stats = await ProductReview.aggregate<{ _id: null; averageRating: number; reviewCount: number }>([
    { $match: { product: product._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);
  const averageRating = Number(stats[0]?.averageRating ?? 0);
  const reviewCount = Number(stats[0]?.reviewCount ?? 0);
  await Product.findByIdAndUpdate(product._id, { $set: { averageRating, reviewCount } });

  return json({ ok: true, summary: { averageRating, reviewCount } }, { status: 201 });
}
