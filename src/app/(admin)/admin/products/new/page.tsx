"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

type Option = { _id: string; name: string };
type SpecRow = { key: string; value: string };
type DocRow = { name: string; url: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    partNumber: "",
    description: "",
    richDescription: "",
    imageUrlsText: "",
    categoryId: "",
    brandId: "",
    costPrice: "0",
    sellingPrice: "0",
    productDeliveryCharge: "0",
    stock: "0",
  });
  const [error, setError] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [specifications, setSpecifications] = useState<SpecRow[]>([{ key: "", value: "" }]);
  const [technicalDocuments, setTechnicalDocuments] = useState<DocRow[]>([{ name: "", url: "" }]);
  const imageLines = form.imageUrlsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const setImageLines = (lines: string[]) => {
    setForm((prev) => ({ ...prev, imageUrlsText: lines.join("\n") }));
  };

  useEffect(() => {
    const run = async () => {
      const [catRes, brandRes] = await Promise.all([fetch("/api/v1/admin/categories"), fetch("/api/v1/admin/brands")]);
      const [catJson, brandJson] = (await Promise.all([catRes.json(), brandRes.json()])) as [{ items?: Option[] }, { items?: Option[] }];
      setCategories(catJson.items ?? []);
      setBrands(brandJson.items ?? []);
    };
    run();
  }, []);

  const submit = async () => {
    setError("");
    if (!form.name.trim()) return setError("Product name is required.");
    if (!form.sku.trim()) return setError("SKU is required.");
    if (!form.partNumber.trim()) return setError("Part number is required.");
    if (!form.categoryId) return setError("Please select a category.");
    const finalSlug = slugify(form.slug || form.name);
    if (!finalSlug) return setError("Valid product name/slug is required.");

    const sanitizedSpecifications = specifications
      .map((spec) => ({ key: spec.key.trim(), value: spec.value.trim() }))
      .filter((spec) => spec.key && spec.value);
    const sanitizedDocuments = technicalDocuments
      .map((doc) => ({ name: doc.name.trim(), url: doc.url.trim() }))
      .filter((doc) => doc.name && doc.url);

    const res = await fetch("/api/v1/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slug: finalSlug,
        imageUrls: imageLines,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        productDeliveryCharge: Number(form.productDeliveryCharge),
        stock: Number(form.stock),
        richDescription: form.richDescription,
        specifications: sanitizedSpecifications,
        technicalDocuments: sanitizedDocuments,
      }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string; details?: { fieldErrors?: Record<string, string[]> } };
      const firstFieldError = body.details?.fieldErrors
        ? Object.values(body.details.fieldErrors).flat().find(Boolean)
        : "";
      setError(firstFieldError || body.error || "Failed to create product");
      return;
    }
    router.push("/admin/products");
  };

  const onUploadImage = async (file: File) => {
    setError("");
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/v1/admin/uploads/image", { method: "POST", body: data });
      const json = (await res.json()) as { imageUrl?: string; error?: string };
      if (!res.ok || !json.imageUrl) {
        setError(json.error || "Image upload failed");
        return;
      }
      setForm((prev) => {
        const lines = prev.imageUrlsText.split("\n").map((line) => line.trim()).filter(Boolean);
        if (json.imageUrl && !lines.includes(json.imageUrl)) lines.push(json.imageUrl);
        return { ...prev, imageUrlsText: lines.join("\n") };
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="max-w-3xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Create Product</h1>
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Product Name</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Name"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((p) => ({ ...p, name, slug: manualSlug ? p.slug : slugify(name) }));
            }}
          />
        </label>
        <label className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">Product Slug</span>
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input type="checkbox" checked={manualSlug} onChange={(e) => setManualSlug(e.target.checked)} />
              Edit manually
            </label>
          </div>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="auto-generated-from-name"
            value={manualSlug ? form.slug : slugify(form.name)}
            onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
            disabled={!manualSlug}
          />
          <p className="text-xs font-medium text-emerald-600">
            {manualSlug ? "Manual mode enabled: you can customize the slug." : "Auto-generated from product name."}
          </p>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">SKU</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="SKU" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Part Number</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Part Number" value={form.partNumber} onChange={(e) => setForm((p) => ({ ...p, partNumber: e.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Description</span>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={6}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
        </label>
        <div className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Detailed Description (Rich Text)</span>
          <RichTextEditor value={form.richDescription} onChange={(html) => setForm((p) => ({ ...p, richDescription: html }))} placeholder="Add title, paragraphs, bullets, links and colored highlights..." />
        </div>
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Specifications</span>
            <button
              type="button"
              onClick={() => setSpecifications((prev) => [...prev, { key: "", value: "" }])}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              + Add specification
            </button>
          </div>
          {specifications.map((spec, idx) => (
            <div key={`spec-${idx}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Key (e.g. Color Temperature)"
                value={spec.key}
                onChange={(e) =>
                  setSpecifications((prev) => prev.map((item, itemIdx) => (itemIdx === idx ? { ...item, key: e.target.value } : item)))
                }
              />
              <input
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Value (e.g. 4000K)"
                value={spec.value}
                onChange={(e) =>
                  setSpecifications((prev) => prev.map((item, itemIdx) => (itemIdx === idx ? { ...item, value: e.target.value } : item)))
                }
              />
              <button
                type="button"
                onClick={() => setSpecifications((prev) => (prev.length === 1 ? [{ key: "", value: "" }] : prev.filter((_, itemIdx) => itemIdx !== idx)))}
                className="rounded border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Technical Documents & Videos</span>
            <button
              type="button"
              onClick={() => setTechnicalDocuments((prev) => [...prev, { name: "", url: "" }])}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              + Add document
            </button>
          </div>
          {technicalDocuments.map((doc, idx) => (
            <div key={`doc-${idx}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Document title"
                value={doc.name}
                onChange={(e) =>
                  setTechnicalDocuments((prev) => prev.map((item, itemIdx) => (itemIdx === idx ? { ...item, name: e.target.value } : item)))
                }
              />
              <input
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="https://example.com/spec-sheet.pdf"
                value={doc.url}
                onChange={(e) =>
                  setTechnicalDocuments((prev) => prev.map((item, itemIdx) => (itemIdx === idx ? { ...item, url: e.target.value } : item)))
                }
              />
              <button
                type="button"
                onClick={() => setTechnicalDocuments((prev) => (prev.length === 1 ? [{ name: "", url: "" }] : prev.filter((_, itemIdx) => itemIdx !== idx)))}
                className="rounded border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Product Image URLs (multiple)</span>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder={"One image URL per line\nhttps://...front.jpg\nhttps://...side.jpg"}
            value={form.imageUrlsText}
            onChange={(e) => setForm((p) => ({ ...p, imageUrlsText: e.target.value }))}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input type="file" accept="image/*" onChange={(e) => (e.target.files?.[0] ? void onUploadImage(e.target.files[0]) : undefined)} />
            {isUploading ? <span className="text-xs text-slate-500">Uploading...</span> : null}
          </div>
          {imageLines.length ? (
            <div className="mt-2 space-y-2">
              {imageLines.map((url, idx) => (
                <div key={`${url}-${idx}`} className="flex items-center gap-2">
                  <Image src={url} alt={`Preview ${idx + 1}`} width={56} height={56} className="rounded border border-slate-200 object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{url}</span>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => {
                      if (idx === 0) return;
                      const next = [...imageLines];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      setImageLines(next);
                    }}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={idx === imageLines.length - 1}
                    onClick={() => {
                      if (idx >= imageLines.length - 1) return;
                      const next = [...imageLines];
                      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                      setImageLines(next);
                    }}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageLines(imageLines.filter((_, i) => i !== idx))}
                    className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Category</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}>
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Brand (Optional)</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.brandId} onChange={(e) => setForm((p) => ({ ...p, brandId: e.target.value }))}>
            <option value="">No brand</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Cost Price / MRP (Rs)</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Cost Price" value={form.costPrice} onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Selling Price (Rs)</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Selling Price" value={form.sellingPrice} onChange={(e) => setForm((p) => ({ ...p, sellingPrice: e.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Product Delivery Charge (Rs per qty)</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="0"
            value={form.productDeliveryCharge}
            onChange={(e) => setForm((p) => ({ ...p, productDeliveryCharge: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Stock Quantity</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Stock" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} />
        </label>
      </div>
      {error ? <p className="mt-3 text-red-600">{error}</p> : null}
      <button onClick={submit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        Save Product
      </button>
    </section>
  );
}

