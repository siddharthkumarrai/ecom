"use client";

import { useEffect, useState } from "react";

type BrandItem = { _id: string; name: string; slug: string };

export default function AdminBrandsPage() {
  const [items, setItems] = useState<BrandItem[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/v1/admin/brands");
      const json = (await res.json()) as { items?: BrandItem[] };
      setItems(json.items ?? []);
    };
    run();
  }, []);

  const create = async () => {
    if (!name.trim() || !slug.trim()) return;
    const res = await fetch("/api/v1/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
    });
    const json = (await res.json()) as { item?: BrandItem };
    setName("");
    setSlug("");
    if (json.item) setItems((prev) => [json.item as BrandItem, ...prev]);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Brands</h1>
        <p className="mt-1 text-sm text-slate-500">Manage all storefront brand labels.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Brand Name</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              placeholder="e.g. Everstar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Brand Slug</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              placeholder="e.g. everstar"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <button
            onClick={create}
            className="self-end rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Add Brand
          </button>
        </div>
      </div>
      <ul className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {items.map((item) => (
          <li key={item._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
            <span className="font-medium text-slate-800">{item.name}</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.slug}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

