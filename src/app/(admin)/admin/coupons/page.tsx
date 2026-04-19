"use client";

import { useEffect, useState } from "react";

type CouponItem = {
  code: string;
  label: string;
  type: "percent" | "fixed";
  appliesTo: "order" | "product" | "category";
  targetIds: string[];
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  perUserLimit: number;
  startsAt: string;
  endsAt: string;
  firstOrderOnly: boolean;
  isActive: boolean;
};

type ProductOption = { _id: string; name: string };
type CategoryOption = { _id: string; name: string };

function makeCoupon(): CouponItem {
  return {
    code: "",
    label: "",
    type: "percent",
    appliesTo: "order",
    targetIds: [],
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
    perUserLimit: 0,
    startsAt: "",
    endsAt: "",
    firstOrderOnly: false,
    isActive: true,
  };
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      const [cmsRes, productsRes, categoriesRes] = await Promise.all([
        fetch("/api/v1/cms"),
        fetch("/api/v1/admin/products"),
        fetch("/api/v1/admin/categories"),
      ]);
      const cmsJson = (await cmsRes.json()) as { config?: { promotions?: { coupons?: CouponItem[] } } };
      const productsJson = (await productsRes.json()) as { items?: ProductOption[] };
      const categoriesJson = (await categoriesRes.json()) as { items?: CategoryOption[] };
      setCoupons(
        (cmsJson.config?.promotions?.coupons ?? []).map((coupon) => ({
          ...makeCoupon(),
          ...coupon,
          targetIds: Array.isArray(coupon.targetIds) ? coupon.targetIds : [],
          startsAt: coupon.startsAt ? String(coupon.startsAt).slice(0, 16) : "",
          endsAt: coupon.endsAt ? String(coupon.endsAt).slice(0, 16) : "",
        }))
      );
      setProducts(productsJson.items ?? []);
      setCategories(categoriesJson.items ?? []);
    };
    load();
  }, []);

  const save = async () => {
    setStatus("Saving...");
    const normalized = coupons.map((coupon) => ({
      ...coupon,
      code: coupon.code.trim().toUpperCase(),
      label: coupon.label.trim(),
      targetIds: coupon.appliesTo === "order" ? [] : coupon.targetIds,
      startsAt: coupon.startsAt || undefined,
      endsAt: coupon.endsAt || undefined,
    }));
    const res = await fetch("/api/v1/cms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promotions: { coupons: normalized } }),
    });
    setStatus(res.ok ? "Saved" : "Failed");
  };

  const now = new Date();
  const computeCouponStatus = (coupon: CouponItem) => {
    if (!coupon.isActive) return { label: "Inactive", className: "bg-zinc-100 text-zinc-700" };
    const starts = coupon.startsAt ? new Date(coupon.startsAt) : null;
    const ends = coupon.endsAt ? new Date(coupon.endsAt) : null;
    if (starts && starts > now) return { label: "Scheduled", className: "bg-blue-50 text-blue-700" };
    if (ends && ends < now) return { label: "Expired", className: "bg-rose-50 text-rose-700" };
    if ((coupon.usageLimit ?? 0) > 0) return { label: "Usage Limited", className: "bg-amber-50 text-amber-700" };
    return { label: "Active", className: "bg-emerald-50 text-emerald-700" };
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Coupons</h1>
        <p className="mt-1 text-sm text-slate-500">Create and manage order, product-wise, and category-wise coupons.</p>
      </div>

      <div className="space-y-3">
        {coupons.map((coupon, idx) => (
          <div key={`coupon-${idx}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{coupon.label || coupon.code || `Coupon ${idx + 1}`}</p>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${computeCouponStatus(coupon).className}`}>
                {computeCouponStatus(coupon).label}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Coupon Code</span>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.code}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, code: e.target.value.toUpperCase() } : c)))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Label</span>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.label}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, label: e.target.value } : c)))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Discount Type</span>
                <select
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.type}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, type: e.target.value as "percent" | "fixed" } : c)))}
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed (Rs)</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Applies To</span>
                <select
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.appliesTo}
                  onChange={(e) =>
                    setCoupons((prev) =>
                      prev.map((c, i) =>
                        i === idx ? { ...c, appliesTo: e.target.value as "order" | "product" | "category", targetIds: [] } : c
                      )
                    )
                  }
                >
                  <option value="order">Entire Order</option>
                  <option value="product">Specific Products</option>
                  <option value="category">Specific Categories</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Value</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.value}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, value: Number(e.target.value) } : c)))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Minimum Order (Rs)</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.minOrderAmount}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, minOrderAmount: Number(e.target.value) } : c)))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Max Discount (Rs, optional)</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.maxDiscountAmount}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, maxDiscountAmount: Number(e.target.value) } : c)))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={coupon.isActive}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, isActive: e.target.checked } : c)))}
                />
                Active
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Global Usage Limit (0 = unlimited)</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.usageLimit}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, usageLimit: Number(e.target.value) } : c)))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Per User Limit (0 = unlimited)</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.perUserLimit}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, perUserLimit: Number(e.target.value) } : c)))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Starts At</span>
                <input
                  type="datetime-local"
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.startsAt}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, startsAt: e.target.value } : c)))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Ends At</span>
                <input
                  type="datetime-local"
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={coupon.endsAt}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, endsAt: e.target.value } : c)))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={coupon.firstOrderOnly}
                  onChange={(e) => setCoupons((prev) => prev.map((c, i) => (i === idx ? { ...c, firstOrderOnly: e.target.checked } : c)))}
                />
                First order only
              </label>
            </div>

            {coupon.appliesTo !== "order" ? (
              <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-600">
                  {coupon.appliesTo === "product" ? "Select Products" : "Select Categories"}
                </p>
                <div className="max-h-36 overflow-auto space-y-1">
                  {(coupon.appliesTo === "product" ? products : categories).map((item) => (
                    <label key={item._id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={coupon.targetIds.includes(item._id)}
                        onChange={(e) =>
                          setCoupons((prev) =>
                            prev.map((c, i) =>
                              i === idx
                                ? {
                                    ...c,
                                    targetIds: e.target.checked
                                      ? [...c.targetIds, item._id]
                                      : c.targetIds.filter((id) => id !== item._id),
                                  }
                                : c
                            )
                          )
                        }
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              className="mt-3 rounded border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              onClick={() => setCoupons((prev) => prev.filter((_, i) => i !== idx))}
            >
              Delete Coupon
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => setCoupons((prev) => [...prev, makeCoupon()])}>
          + Add Coupon
        </button>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black" onClick={save}>
          Save Coupons
        </button>
        {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
      </div>
    </section>
  );
}
