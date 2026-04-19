"use client";

import { useEffect, useState } from "react";

type CategoryItem = { _id: string; name: string; slug: string };

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/v1/admin/categories");
      const json = (await res.json()) as { items?: CategoryItem[] };
      setItems(json.items ?? []);
    };
    run();
  }, []);

  const create = async () => {
    setError("");
    if (!name.trim() || !slug.trim()) return;
    const res = await fetch("/api/v1/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
    });
    const json = (await res.json()) as { item?: CategoryItem; error?: string };
    if (!res.ok) {
      setError(json.error || "Failed to create category.");
      return;
    }
    setName("");
    setSlug("");
    if (json.item) setItems((prev) => [json.item as CategoryItem, ...prev]);
  };

  const beginEdit = (item: CategoryItem) => {
    setEditingId(item._id);
    setEditName(item.name);
    setEditSlug(item.slug);
    setError("");
  };

  const saveEdit = async (id: string) => {
    setError("");
    if (!editName.trim() || !editSlug.trim()) return;
    setBusyId(id);
    const res = await fetch(`/api/v1/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
    });
    const json = (await res.json().catch(() => ({}))) as { item?: CategoryItem; error?: string };
    setBusyId(null);
    if (!res.ok) {
      setError(json.error || "Failed to update category.");
      return;
    }
    if (json.item) {
      setItems((prev) => prev.map((item) => (item._id === id ? json.item! : item)));
    }
    setEditingId(null);
  };

  const removeCategory = async (id: string) => {
    setError("");
    if (!window.confirm("Delete this category?")) return;
    setBusyId(id);
    const res = await fetch(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusyId(null);
    if (!res.ok) {
      setError(json.error || "Failed to delete category.");
      return;
    }
    setItems((prev) => prev.filter((item) => item._id !== id));
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <p className="mt-1 text-sm text-slate-500">Create and manage product categories.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Category Name</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              placeholder="e.g. IC"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Category Slug</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              placeholder="e.g. ic"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <button
            onClick={create}
            className="self-end rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Add Category
          </button>
        </div>
      </div>
      <ul className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {items.map((item) => (
          <li key={item._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
            {editingId === item._id ? (
              <div className="grid w-full gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(item._id)}
                    disabled={busyId === item._id}
                    className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busyId === item._id ? "Saving..." : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="font-medium text-slate-800">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.slug}</span>
                  <button type="button" onClick={() => beginEdit(item)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCategory(item._id)}
                    disabled={busyId === item._id}
                    className="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {busyId === item._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

