import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { Cart } from "@/lib/db/models/Cart.model";
import { connectDB } from "@/lib/db/mongoose";
import { computeCartTotals } from "@/lib/cart/pricing";
import mongoose from "mongoose";

type CartItem = { product: mongoose.Types.ObjectId; quantity: number };
type CartDocWithItems = mongoose.Document & { items: CartItem[] };

const AddSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100000),
  couponCode: z.string().optional(),
  replaceCart: z.boolean().optional().default(false),
});

const UpdateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(100000),
  couponCode: z.string().optional(),
});

const RemoveSchema = z.object({
  productId: z.string().min(1),
  couponCode: z.string().optional(),
});

export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return error("Unauthorized", 401);

  await connectDB();
  const cart = await Cart.findOne({ user: user._id }).lean<{ items: CartItem[] } | null>();
  const items = cart?.items ?? [];

  try {
    const url = new URL(req.url);
    const couponCode = url.searchParams.get("couponCode") ?? undefined;
    const totals = await computeCartTotals(items, couponCode, user._id);
    return json({ cart: { items }, totals });
  } catch (e) {
    return error("Cart invalid", 400, String(e));
  }
}

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  if (!mongoose.isValidObjectId(parsed.data.productId)) return error("Invalid productId", 400);

  await connectDB();
  const productObjId = new mongoose.Types.ObjectId(parsed.data.productId);

  const cart = (await Cart.findOneAndUpdate(
    { user: user._id },
    { $setOnInsert: { user: user._id, items: [] } },
    { upsert: true, new: true }
  )) as unknown as CartDocWithItems;

  if (parsed.data.replaceCart) {
    cart.items = [{ product: productObjId, quantity: parsed.data.quantity }];
  } else {
    const existing = cart.items.find((i) => String(i.product) === String(productObjId));
    if (existing) existing.quantity += parsed.data.quantity;
    else cart.items.push({ product: productObjId, quantity: parsed.data.quantity });
  }

  await cart.save();

  const totals = await computeCartTotals(cart.items, parsed.data.couponCode, user._id);
  return json({ cart: { items: cart.items }, totals });
}

export async function PATCH(req: Request) {
  const { user } = await requireUser();
  if (!user) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());
  if (!mongoose.isValidObjectId(parsed.data.productId)) return error("Invalid productId", 400);

  await connectDB();
  const cart = (await Cart.findOne({ user: user._id })) as unknown as CartDocWithItems | null;
  if (!cart) return json({ cart: { items: [] }, totals: null });

  cart.items = cart.items.filter((i) => String(i.product) !== parsed.data.productId);
  if (parsed.data.quantity > 0) {
    cart.items.push({ product: new mongoose.Types.ObjectId(parsed.data.productId), quantity: parsed.data.quantity });
  }
  await cart.save();

  const totals = await computeCartTotals(cart.items, parsed.data.couponCode, user._id);
  return json({ cart: { items: cart.items }, totals });
}

export async function DELETE(req: Request) {
  const { user } = await requireUser();
  if (!user) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = RemoveSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  const cart = (await Cart.findOne({ user: user._id })) as unknown as CartDocWithItems | null;
  if (!cart) return json({ ok: true });

  cart.items = cart.items.filter((i) => String(i.product) !== parsed.data.productId);
  await cart.save();
  const totals = await computeCartTotals(cart.items, parsed.data.couponCode, user._id);
  return json({ ok: true, cart: { items: cart.items }, totals });
}

