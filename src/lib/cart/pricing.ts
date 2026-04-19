import { Product } from "@/lib/db/models/Product.model";
import { SiteConfig } from "@/lib/db/models/SiteConfig.model";
import { Order } from "@/lib/db/models/Order.model";
import type mongoose from "mongoose";

export async function computeCartTotals(
  items: Array<{ product: mongoose.Types.ObjectId; quantity: number }>,
  couponCode?: string,
  userId?: mongoose.Types.ObjectId
) {
  const config = await SiteConfig.findOne({ key: "main" }).lean();
  const shippingCfg = config?.shipping;
  const coupons = config?.promotions?.coupons ?? [];

  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true })
    .select("basePrice salePrice isOnSale stock minOrderQty maxOrderQty isCODEnabled isPrepaidOnly name sku images hsnCode category productDeliveryCharge")
    .lean();

  const productById = new Map(products.map((p) => [String(p._id), p]));

  let subtotal = 0;
  let productWiseShippingCharge = 0;
  let hasPrepaidOnly = false;
  let allCodEligible = true;

  for (const item of items) {
    const p = productById.get(String(item.product));
    if (!p) throw new Error("PRODUCT_NOT_FOUND");

    const qty = item.quantity;
    if (qty < (p.minOrderQty ?? 1) || qty > (p.maxOrderQty ?? 10000)) throw new Error("INVALID_QTY");
    if ((p.stock ?? 0) < qty) throw new Error("INSUFFICIENT_STOCK");

    const unit = p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice;
    subtotal += unit * qty;
    const lineDeliveryCharge = (typeof (p as { productDeliveryCharge?: number }).productDeliveryCharge === "number" ? (p as { productDeliveryCharge?: number }).productDeliveryCharge ?? 0 : 0) * qty;
    productWiseShippingCharge += lineDeliveryCharge;

    if (p.isPrepaidOnly) hasPrepaidOnly = true;
    if (!p.isCODEnabled) allCodEligible = false;
  }

  const freeThreshold = shippingCfg?.freeShippingThreshold ?? 500;
  const defaultShip = shippingCfg?.defaultShippingCharge ?? 50;
  const taxPercent = shippingCfg?.taxPercent ?? 18;

  const baseShippingCharge = subtotal >= freeThreshold ? 0 : defaultShip;
  const shippingCharge = baseShippingCharge + productWiseShippingCharge;
  let discountAmount = 0;
  let appliedCouponCode = "";

  if (couponCode) {
    const normalized = couponCode.trim().toUpperCase();
    const matched = coupons.find((coupon) => coupon?.isActive && String(coupon?.code ?? "").toUpperCase() === normalized);
    if (matched && subtotal >= (matched.minOrderAmount ?? 0)) {
      const now = new Date();
      const startsAt = matched.startsAt ? new Date(matched.startsAt) : null;
      const endsAt = matched.endsAt ? new Date(matched.endsAt) : null;
      const isWithinDateWindow = (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
      if (!isWithinDateWindow) {
        const earlyTaxableAmount = Math.max(0, subtotal);
        const earlyTaxAmount = (earlyTaxableAmount * taxPercent) / 100;
        return {
          subtotal: round2(subtotal),
          shippingCharge: round2(shippingCharge),
          taxAmount: round2(earlyTaxAmount),
          taxPercent: round2(taxPercent),
          discountAmount: 0,
          appliedCouponCode: "",
          total: round2(subtotal + earlyTaxAmount + shippingCharge),
          hasPrepaidOnly,
          allCodEligible,
          config,
          products: products.map((p) => ({
            id: String(p._id),
            name: p.name,
            sku: p.sku,
            image: p.images?.[0] ?? "",
            hsnCode: p.hsnCode ?? "",
            unitPrice: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
            stock: p.stock ?? 0,
            minOrderQty: p.minOrderQty ?? 1,
            maxOrderQty: p.maxOrderQty ?? 10000,
            isCODEnabled: !!p.isCODEnabled,
            isPrepaidOnly: !!p.isPrepaidOnly,
          })),
        };
      }

      if (userId) {
        const [totalCouponUses, userCouponUses, userOrderCount] = await Promise.all([
          Order.countDocuments({ couponCode: normalized }),
          Order.countDocuments({ user: userId, couponCode: normalized }),
          Order.countDocuments({ user: userId }),
        ]);
        if ((matched.usageLimit ?? 0) > 0 && totalCouponUses >= (matched.usageLimit ?? 0)) {
          // exhausted globally
        } else if ((matched.perUserLimit ?? 0) > 0 && userCouponUses >= (matched.perUserLimit ?? 0)) {
          // exhausted for user
        } else if (matched.firstOrderOnly && userOrderCount > 0) {
          // not first order
        } else {
          const appliesTo = matched.appliesTo ?? "order";
          const targets = Array.isArray(matched.targetIds) ? matched.targetIds.map((id) => String(id)) : [];
          let eligibleSubtotal = subtotal;
          if (appliesTo !== "order") {
            eligibleSubtotal = 0;
            for (const item of items) {
              const p = productById.get(String(item.product));
              if (!p) continue;
              const isEligible =
                appliesTo === "product"
                  ? targets.includes(String(p._id))
                  : targets.includes(String((p as { category?: unknown }).category ?? ""));
              if (!isEligible) continue;
              const unit = p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice;
              eligibleSubtotal += unit * item.quantity;
            }
          }
          if (eligibleSubtotal <= 0) {
            discountAmount = 0;
          } else if (matched.type === "percent") {
            discountAmount = (eligibleSubtotal * (matched.value ?? 0)) / 100;
          } else {
            discountAmount = Math.min(matched.value ?? 0, eligibleSubtotal);
          }
          if ((matched.maxDiscountAmount ?? 0) > 0) {
            discountAmount = Math.min(discountAmount, matched.maxDiscountAmount ?? 0);
          }
          discountAmount = Math.min(discountAmount, subtotal);
          appliedCouponCode = normalized;
        }
      } else {
      const appliesTo = matched.appliesTo ?? "order";
      const targets = Array.isArray(matched.targetIds) ? matched.targetIds.map((id) => String(id)) : [];
      let eligibleSubtotal = subtotal;
      if (appliesTo !== "order") {
        eligibleSubtotal = 0;
        for (const item of items) {
          const p = productById.get(String(item.product));
          if (!p) continue;
          const isEligible =
            appliesTo === "product"
              ? targets.includes(String(p._id))
              : targets.includes(String((p as { category?: unknown }).category ?? ""));
          if (!isEligible) continue;
          const unit = p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice;
          eligibleSubtotal += unit * item.quantity;
        }
      }
      if (eligibleSubtotal <= 0) {
        discountAmount = 0;
      } else if (matched.type === "percent") {
        discountAmount = (eligibleSubtotal * (matched.value ?? 0)) / 100;
      } else {
        discountAmount = Math.min(matched.value ?? 0, eligibleSubtotal);
      }
      if ((matched.maxDiscountAmount ?? 0) > 0) {
        discountAmount = Math.min(discountAmount, matched.maxDiscountAmount ?? 0);
      }
      discountAmount = Math.min(discountAmount, subtotal);
      appliedCouponCode = normalized;
      }
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const total = subtotal + taxAmount + shippingCharge - discountAmount;

  return {
    subtotal: round2(subtotal),
    shippingCharge: round2(shippingCharge),
    taxAmount: round2(taxAmount),
    taxPercent: round2(taxPercent),
    discountAmount: round2(discountAmount),
    appliedCouponCode,
    total: round2(total),
    hasPrepaidOnly,
    allCodEligible,
    config,
    products: products.map((p) => ({
      id: String(p._id),
      name: p.name,
      sku: p.sku,
      image: p.images?.[0] ?? "",
      hsnCode: p.hsnCode ?? "",
      unitPrice: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
      stock: p.stock ?? 0,
      minOrderQty: p.minOrderQty ?? 1,
      maxOrderQty: p.maxOrderQty ?? 10000,
      isCODEnabled: !!p.isCODEnabled,
      isPrepaidOnly: !!p.isPrepaidOnly,
    })),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

