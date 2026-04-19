"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type ProductItem = {
  _id: string;
  name: string;
  sku: string;
  category?: unknown;
  images?: string[];
  costPrice?: number | null;
  productDeliveryCharge?: number;
  basePrice: number;
  stock: number;
  isActive: boolean;
};

type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
};

function normalizeCategoryId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) {
    const rawId = (value as { _id?: unknown })._id;
    return typeof rawId === "string" ? rawId : "";
  }
  return "";
}

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [deliveryDraft, setDeliveryDraft] = useState("");
  const [savingDeliveryId, setSavingDeliveryId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/v1/admin/categories");
      const data = (await res.json().catch(() => ({}))) as { items?: CategoryItem[] };
      setCategories(data.items ?? []);
    };
    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      const categoryQuery = selectedCategoryId ? `?categoryId=${encodeURIComponent(selectedCategoryId)}` : "";
      const res = await fetch(`/api/v1/admin/products${categoryQuery}`);
      const data = (await res.json().catch(() => ({}))) as { items?: ProductItem[] };
      setItems(data.items ?? []);
    };
    void run();
  }, [selectedCategoryId]);

  const categoryNameById = new Map(categories.map((category) => [category._id, category.name]));

  const removeProduct = async (id: string) => {
    setError("");
    const ok = window.confirm("Delete this product? This action cannot be undone.");
    if (!ok) return;
    setDeletingId(id);
    const res = await fetch(`/api/v1/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error || "Failed to delete product.");
      setDeletingId(null);
      return;
    }
    setItems((prev) => prev.filter((item) => item._id !== id));
    setDeletingId(null);
  };

  const startEditDelivery = (item: ProductItem) => {
    setError("");
    setEditingDeliveryId(item._id);
    setDeliveryDraft(String(item.productDeliveryCharge ?? 0));
  };

  const cancelEditDelivery = () => {
    setEditingDeliveryId(null);
    setDeliveryDraft("");
  };

  const saveDeliveryCharge = async (item: ProductItem) => {
    const next = Number(deliveryDraft);
    if (!Number.isFinite(next) || next < 0) {
      setError("Delivery charge must be a valid non-negative number.");
      return;
    }
    setSavingDeliveryId(item._id);
    setError("");
    const res = await fetch(`/api/v1/admin/products/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productDeliveryCharge: next }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error || "Failed to update delivery charge.");
      setSavingDeliveryId(null);
      return;
    }
    setItems((prev) =>
      prev.map((p) =>
        p._id === item._id
          ? {
              ...p,
              productDeliveryCharge: next,
            }
          : p
      )
    );
    setSavingDeliveryId(null);
    cancelEditDelivery();
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Products</h1>
            <p className="mt-1 text-sm text-slate-500">Track inventory and product status.</p>
          </div>
          <Link href="/admin/products/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + Add Product
          </Link>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(260px,380px)_1fr] md:items-end">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Filter by category</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name} ({category.slug})
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{items.length}</span> product{items.length === 1 ? "" : "s"}.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-3">Image</th>
              <th className="py-3">Name</th>
              <th className="py-3">Category</th>
              <th className="py-3">SKU</th>
              <th className="py-3">Cost Price</th>
              <th className="py-3">Selling Price</th>
              <th className="py-3">Delivery Charge</th>
              <th className="py-3">Stock</th>
              <th className="py-3">Status</th>
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id} className="border-b last:border-0">
                <td className="py-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded border border-slate-200 bg-slate-100">
                    {item.images?.[0] ? <Image src={item.images[0]} alt={item.name} fill className="object-cover" sizes="40px" /> : null}
                  </div>
                </td>
                <td className="py-3 font-medium text-slate-800">{item.name}</td>
                <td className="py-3 text-slate-600">
                  {(() => {
                    const categoryId = normalizeCategoryId(item.category);
                    if (!categoryId) return "-";
                    return categoryNameById.get(categoryId) || categoryId;
                  })()}
                </td>
                <td className="py-3 text-slate-600">{item.sku}</td>
                <td className="py-3 text-slate-500">{typeof item.costPrice === "number" ? `Rs ${item.costPrice}` : "-"}</td>
                <td className="py-3 text-slate-700 font-semibold">Rs {item.basePrice}</td>
                <td className="py-3 text-slate-700">
                  {editingDeliveryId === item._id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={deliveryDraft}
                        onChange={(e) => setDeliveryDraft(e.target.value)}
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => saveDeliveryCharge(item)}
                        disabled={savingDeliveryId === item._id}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingDeliveryId === item._id ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditDelivery}
                        disabled={savingDeliveryId === item._id}
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{typeof item.productDeliveryCharge === "number" ? `Rs ${item.productDeliveryCharge}` : "Rs 0"}</span>
                      <button
                        type="button"
                        onClick={() => startEditDelivery(item)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-3 text-slate-700">{item.stock}</td>
                <td className="py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/products/${item._id}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeProduct(item._id)}
                      disabled={deletingId === item._id}
                      className="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === item._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {!items.length ? (
          <p className="py-6 text-center text-sm text-slate-500">No products yet. Add your first product.</p>
        ) : null}
      </div>
    </section>
  );
}
