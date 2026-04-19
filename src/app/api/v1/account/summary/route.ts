import { json } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";
import { Cart } from "@/lib/db/models/Cart.model";

export async function GET() {
  const { user } = await requireUser();
  if (!user?._id) return json({ cartCount: 0, wishlistCount: 0, isAuthenticated: false });

  await connectDB();
  const [dbUser, cart] = await Promise.all([
    User.findById(user._id).select("wishlist").lean<{ wishlist?: unknown[] } | null>(),
    Cart.findOne({ user: user._id }).select("items").lean<{ items?: Array<{ quantity?: number }> } | null>(),
  ]);
  const wishlistCount = dbUser?.wishlist?.length ?? 0;
  const cartCount = (cart?.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  return json({ cartCount, wishlistCount, isAuthenticated: true });
}
