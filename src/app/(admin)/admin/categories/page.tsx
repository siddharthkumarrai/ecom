"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type CategoryItem = { _id: string; name: string; slug: string; image?: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [manualCreateSlug, setManualCreateSlug] = useState(false);
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editImage, setEditImage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isUploadingCreate, setIsUploadingCreate] = useState(false);
  const [uploadingEditId, setUploadingEditId] = useState<string | null>(null);
  const [createFileName, setCreateFileName] = useState("");
  const [editFileNameById, setEditFileNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/v1/admin/categories");
      const json = (await res.json()) as { items?: CategoryItem[] };
      setItems(json.items ?? []);
    };
    run();
  }, []);

  const uploadImageFile = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    const res = await fetch("/api/v1/admin/uploads/image", { method: "POST", body: data });
    const json = (await res.json().catch(() => ({}))) as { imageUrl?: string; error?: string };
    if (!res.ok || !json.imageUrl) {
      setError(json.error || "Image upload failed.");
      return null;
    }
    return json.imageUrl;
  };

  const onUploadCreateImage = async (file: File) => {
    setError("");
    setIsUploadingCreate(true);
    setCreateFileName(file.name);
    try {
      const imageUrl = await uploadImageFile(file);
      if (imageUrl) setImage(imageUrl);
    } finally {
      setIsUploadingCreate(false);
    }
  };

  const onUploadEditImage = async (id: string, file: File) => {
    setError("");
    setUploadingEditId(id);
    setEditFileNameById((prev) => ({ ...prev, [id]: file.name }));
    try {
      const imageUrl = await uploadImageFile(file);
      if (imageUrl) setEditImage(imageUrl);
    } finally {
      setUploadingEditId(null);
    }
  };

  const create = async () => {
    setError("");
    const finalSlug = slugify(manualCreateSlug ? slug : name);
    if (!name.trim() || !finalSlug) return;
    const res = await fetch("/api/v1/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: finalSlug, image: image.trim() }),
    });
    const json = (await res.json()) as { item?: CategoryItem; error?: string };
    if (!res.ok) {
      setError(json.error || "Failed to create category.");
      return;
    }
    setName("");
    setSlug("");
    setManualCreateSlug(false);
    setImage("");
    setCreateFileName("");
    if (json.item) setItems((prev) => [json.item as CategoryItem, ...prev]);
  };

  const beginEdit = (item: CategoryItem) => {
    setEditingId(item._id);
    setEditName(item.name);
    setEditSlug(item.slug);
    setEditImage(String(item.image ?? "").trim());
    setEditFileNameById((prev) => ({ ...prev, [item._id]: "" }));
    setError("");
  };

  const saveEdit = async (id: string) => {
    setError("");
    if (!editName.trim() || !editSlug.trim()) return;
    setBusyId(id);
    const res = await fetch(`/api/v1/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim(), image: editImage.trim() }),
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
        <p className="mt-1 text-sm text-slate-500">Create and manage product categories with image URL or uploaded image.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Category Name</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              placeholder="e.g. IC"
              value={name}
              onChange={(e) => {
                const nextName = e.target.value;
                setName(nextName);
                if (!manualCreateSlug) {
                  setSlug(slugify(nextName));
                }
              }}
            />
          </label>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">Category Slug</span>
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={manualCreateSlug}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setManualCreateSlug(enabled);
                    if (enabled && !slug.trim()) {
                      setSlug(slugify(name));
                    }
                  }}
                />
                Edit manually
              </span>
            </div>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              placeholder="e.g. ic"
              value={manualCreateSlug ? slug : slugify(name)}
              onChange={(e) => setSlug(e.target.value)}
              disabled={!manualCreateSlug}
            />
          </div>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Image URL / URI</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              placeholder="https://..."
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </label>
          <button
            onClick={create}
            className="self-end rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Add Category
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 transition hover:bg-slate-100 ${
              isUploadingCreate ? "cursor-not-allowed opacity-70" : ""
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploadingCreate}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUploadCreateImage(file);
                e.currentTarget.value = "";
              }}
            />
            {isUploadingCreate ? "Uploading..." : "Upload image"}
          </label>
          <span className="text-xs text-slate-500">{createFileName || "No file chosen"}</span>
          {image ? (
            <a href={image} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 underline">
              Open uploaded image
            </a>
          ) : null}
        </div>
      </div>
      <ul className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {items.map((item) => (
          <li key={item._id} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
            {editingId === item._id ? (
              <div className="grid w-full gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
                <input
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="https://..."
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                />
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
                <div className="md:col-span-4 flex flex-wrap items-center gap-3">
                  <label
                    className={`inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 transition hover:bg-slate-100 ${
                      uploadingEditId === item._id ? "cursor-not-allowed opacity-70" : ""
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingEditId === item._id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUploadEditImage(item._id, file);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploadingEditId === item._id ? "Uploading..." : "Upload image"}
                  </label>
                  <span className="text-xs text-slate-500">{editFileNameById[item._id] || "No file chosen"}</span>
                  {editImage ? (
                    <a href={editImage} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 underline">
                      Open uploaded image
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill sizes="40px" className="object-contain p-1" />
                    ) : (
                      <span className="m-auto text-[10px] text-slate-400">No image</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{item.name}</p>
                    <span className="mt-0.5 inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
              </div>
            )}
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
