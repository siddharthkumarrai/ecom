import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/requireUser";
import { Cart } from "@/lib/db/models/Cart.model";
import { Product } from "@/lib/db/models/Product.model";
import { connectDB } from "@/lib/db/mongoose";
import { computeCartTotals } from "@/lib/cart/pricing";
import mongoose from "mongoose";

type CartItem = { product: mongoose.Types.ObjectId; quantity: number };
type CartDocWithItems = mongoose.Document & { items: CartItem[] };

function parseCartErrorMessage(value: unknown) {
  const message = value instanceof Error ? value.message : String(value ?? "");
  switch (message) {
    case "PRODUCT_NOT_FOUND":
      return "Some products are unavailable right now.";
    case "INVALID_QTY":
      return "Some cart quantities were invalid and need to be updated.";
    case "INSUFFICIENT_STOCK":
      return "Some products do not have enough stock.";
    default:
      return "Cart invalid";
  }
}

function areCartItemsEqual(a: CartItem[], b: CartItem[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (String(a[i]?.product) !== String(b[i]?.product)) return false;
    if (Number(a[i]?.quantity) !== Number(b[i]?.quantity)) return false;
  }
  return true;
}

async function normalizeCartItems(items: CartItem[]) {
  const requestedQuantityByProductId = new Map<string, number>();
  for (const item of items) {
    const productId = String(item?.product ?? "");
    if (!mongoose.isValidObjectId(productId)) continue;
    const rawQty = Math.max(0, Math.trunc(Number(item?.quantity ?? 0)));
    if (rawQty <= 0) continue;
    requestedQuantityByProductId.set(productId, (requestedQuantityByProductId.get(productId) ?? 0) + rawQty);
  }

  if (!requestedQuantityByProductId.size) return [] as CartItem[];

  const productIds = [...requestedQuantityByProductId.keys()].map((id) => new mongoose.Types.ObjectId(id));
  const products = await Product.find({ _id: { $in: productIds }, isActive: true })
    .select("_id minOrderQty maxOrderQty stock")
    .lean<Array<{ _id: mongoose.Types.ObjectId; minOrderQty?: number; maxOrderQty?: number; stock?: number }>>();
  const productById = new Map(products.map((product) => [String(product._id), product]));

  const normalized: CartItem[] = [];
  for (const [productId, requestedQty] of requestedQuantityByProductId) {
    const product = productById.get(productId);
    if (!product) continue;

    const stock = Math.max(0, Math.trunc(Number(product.stock ?? 0)));
    if (stock <= 0) continue;

    const minQty = Math.max(1, Math.trunc(Number(product.minOrderQty ?? 1)));
    if (stock < minQty) continue;
    const configuredMax = Math.max(minQty, Math.trunc(Number(product.maxOrderQty ?? 10000)));
    const maxQty = Math.min(configuredMax, stock);
    if (maxQty <= 0) continue;

    const effectiveMin = minQty;
    const quantity = Math.min(Math.max(requestedQty, effectiveMin), maxQty);
    normalized.push({ product: new mongoose.Types.ObjectId(productId), quantity });
  }

  return normalized;
}

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
  const cart = (await Cart.findOne({ user: user._id })) as unknown as CartDocWithItems | null;
  const currentItems = cart?.items ?? [];
  const normalizedItems = await normalizeCartItems(currentItems);
  if (cart && !areCartItemsEqual(currentItems, normalizedItems)) {
    cart.items = normalizedItems;
    await cart.save();
  }

  try {
    const url = new URL(req.url);
    const couponCode = url.searchParams.get("couponCode") ?? undefined;
    const totals = await computeCartTotals(normalizedItems, couponCode, user._id);
    return json({ cart: { items: normalizedItems }, totals });
  } catch (e) {
    return error(parseCartErrorMessage(e), 400, String(e));
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
    { upsert: true, returnDocument: "after" }
  )) as unknown as CartDocWithItems;

  if (parsed.data.replaceCart) {
    cart.items = [{ product: productObjId, quantity: parsed.data.quantity }];
  } else {
    const existing = cart.items.find((i) => String(i.product) === String(productObjId));
    if (existing) existing.quantity += parsed.data.quantity;
    else cart.items.push({ product: productObjId, quantity: parsed.data.quantity });
  }

  cart.items = await normalizeCartItems(cart.items);
  if (!cart.items.some((item) => String(item.product) === String(productObjId))) {
    return error("This product cannot be added to cart right now.", 400);
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
  cart.items = await normalizeCartItems(cart.items);
  if (parsed.data.quantity > 0 && !cart.items.some((item) => String(item.product) === parsed.data.productId)) {
    return error("This product cannot be updated in cart right now.", 400);
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
  cart.items = await normalizeCartItems(cart.items);
  await cart.save();
  const totals = await computeCartTotals(cart.items, parsed.data.couponCode, user._id);
  return json({ ok: true, cart: { items: cart.items }, totals });
}
