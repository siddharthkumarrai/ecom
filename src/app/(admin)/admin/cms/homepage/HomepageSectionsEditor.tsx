"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { SectionType } from "@/lib/storefront/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SectionRow = {
  id: string;
  type: SectionType;
  order: number;
  enabled: boolean;
  config: Record<string, unknown>;
};

type ProductOption = {
  id: string;
  name: string;
  slug: string;
  partNumber: string;
  imageUrl: string;
  price: number;
};

type ProductApiItem = {
  _id?: string;
  name?: string;
  slug?: string;
  partNumber?: string;
  images?: unknown[];
  basePrice?: number;
  salePrice?: number;
  isOnSale?: boolean;
};

type CategoryOption = {
  _id?: string;
  slug: string;
  name: string;
  image?: string;
  isActive?: boolean;
};

function toProductOption(item: ProductApiItem): ProductOption | null {
  const imageUrl = Array.isArray(item.images) && typeof item.images[0] === "string" ? String(item.images[0]) : "";
  const basePrice = typeof item.basePrice === "number" ? item.basePrice : 0;
  const salePrice = typeof item.salePrice === "number" ? item.salePrice : basePrice;
  const parsed: ProductOption = {
    id: String(item._id || ""),
    name: String(item.name || ""),
    slug: String(item.slug || ""),
    partNumber: String(item.partNumber || ""),
    imageUrl,
    price: item.isOnSale ? salePrice : basePrice,
  };
  return parsed.id && parsed.slug && parsed.name ? parsed : null;
}

function mergeProductOptions(...lists: ProductOption[][]): ProductOption[] {
  const byId = new Map<string, ProductOption>();
  for (const list of lists) {
    for (const item of list) {
      if (!item.id || byId.has(item.id)) continue;
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

/** High-contrast form controls (fixes invisible text when OS / globals use dark color-scheme). */
const FORM_CONTROL =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-zinc-900 placeholder:text-slate-500";

const BTN_OUTLINE_SOLID = "border-slate-300 bg-white text-zinc-900 hover:bg-slate-100 hover:text-zinc-900";

/** Short labels for the rail (Shopify-style). */
const SECTION_SHORT: Record<SectionType, string> = {
  announcement_bar: "Announcement bar",
  navbar: "Header",
  hero_carousel: "Hero",
  promo_tiles: "Promo tiles",
  featured_tabs: "Featured products",
  week_deals: "Week deals",
  category_product_row: "Category products",
  brand_banner: "Promo banner",
  top_categories_grid: "Top categories",
  brand_logos_strip: "Brand logos",
  triple_product_lists: "Product lists + banner",
  newsletter_signup: "Newsletter",
  footer: "Footer",
};

const SECTION_HINT: Record<SectionType, string> = {
  announcement_bar: "Controls the live top strip text and visibility.",
  navbar: "Controls live header store name, browser title, favicon, and navbar background color.",
  hero_carousel: "Main hero carousel with slide links/images and optional right-side stack of 3 admin-selected product cards.",
  promo_tiles: "Legacy promo stack. Hero now has its own right-side product stack; use this block only outside Hero row.",
  featured_tabs: "Featured / On Sale / Top Rated tabs with admin-selected database products.",
  week_deals: "Countdown + product row.",
  category_product_row: "Grid for one category.",
  brand_banner: "Image-only horizontal promo banner with separate desktop and mobile images.",
  top_categories_grid: "Top category cards with image + title.",
  brand_logos_strip: "Horizontal brand logo carousel (gray -> color on hover).",
  triple_product_lists: "Featured/On Sale/Top Rated mini columns + side banner.",
  newsletter_signup: "Email capture strip.",
  footer: "Controls the live global footer layout, content, and newsletter strip.",
};

const ADDABLE_TYPES: SectionType[] = [
  "hero_carousel",
  "featured_tabs",
  "week_deals",
  "category_product_row",
  "brand_banner",
  "top_categories_grid",
  "brand_logos_strip",
  "triple_product_lists",
  "newsletter_signup",
  "announcement_bar",
  "navbar",
  "footer",
];

const FIXED_FEATURED_TABS = [
  { id: "featured", title: "Featured" },
  { id: "onsale", title: "On Sale" },
  { id: "topRated", title: "Top Rated" },
] as const;

function normalizeOrders(list: SectionRow[]): SectionRow[] {
  return list.map((s, i) => ({ ...s, order: (i + 1) * 10 }));
}

function stripLegacyPromoTiles(list: SectionRow[]): SectionRow[] {
  return normalizeOrders(list.filter((section) => section.type !== "promo_tiles"));
}

type FeaturedTabConfigForm = {
  id: string;
  title: string;
  productIds: string[];
};

function parseFeaturedTabs(raw: unknown): FeaturedTabConfigForm[] {
  const incoming = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, FeaturedTabConfigForm>();
  for (const item of incoming) {
    const tab = (item ?? {}) as Record<string, unknown>;
    const id = String(tab.id ?? "").trim();
    if (!id) continue;
    byId.set(id, {
      id,
      title: String(tab.title ?? ""),
      productIds: Array.isArray(tab.productIds)
        ? tab.productIds.map((productId) => String(productId).trim()).filter(Boolean)
        : [],
    });
  }

  return FIXED_FEATURED_TABS.map((tab) => {
    const existing = byId.get(tab.id);
    return {
      id: tab.id,
      title: existing?.title || tab.title,
      productIds: existing?.productIds ?? [],
    };
  });
}

function parseTripleProductTabs(raw: unknown): FeaturedTabConfigForm[] {
  return parseFeaturedTabs(raw).map((tab) => ({
    ...tab,
    productIds: tab.productIds.slice(0, 3),
  }));
}

function parseProductIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.map((productId) => String(productId).trim()).filter(Boolean);
  return Array.from(new Set(ids));
}

function toDateTimeLocalInputValue(iso: unknown): string {
  const raw = String(iso ?? "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromDateTimeLocalInput(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newSection(type: SectionType, categorySlug?: string): SectionRow {
  const id = newId();
  const base = { id, type, order: 999, enabled: true, config: {} as Record<string, unknown> };
  switch (type) {
    case "category_product_row":
      return {
        ...base,
        config: {
          title: categorySlug ? categorySlug.toUpperCase() : "Category",
          categorySlug: categorySlug || "",
          productLimit: 0,
          anchorTitle: categorySlug ? `Browse ${categorySlug.toUpperCase()}` : "",
          anchorHref: categorySlug ? `/category/${categorySlug}` : "",
          anchorLinks: categorySlug
            ? [{ title: `Browse ${categorySlug.toUpperCase()}`, href: `/category/${categorySlug}` }]
            : [],
          promoImageUrl: "",
          promoHref: "",
          promoAlt: "",
        },
      };
    case "brand_banner":
      return {
        ...base,
        config: {
          href: "/brands/everstar",
          desktopImageUrl: "https://lumenskart.in/public/uploads/all/0nykr2ZauQA6nblRp3iOiivYHW1mWsHo6UJVUtVe.webp",
          mobileImageUrl: "https://lumenskart.in/public/uploads/all/0nykr2ZauQA6nblRp3iOiivYHW1mWsHo6UJVUtVe.webp",
        },
      };
    case "navbar":
      return {
        ...base,
        config: {
          storeName: "",
          storeTitle: "",
          favicon: "",
          navbarBg: "#f5c400",
        },
      };
    case "newsletter_signup":
      return { ...base, config: { text: "", placeholder: "Email address", buttonText: "Sign Up" } };
    case "top_categories_grid":
      return { ...base, config: { title: "Top Categories this Week", categorySlugs: [] } };
    case "brand_logos_strip":
      return { ...base, config: { brands: [], brandItems: [] } };
    case "week_deals":
      return {
        ...base,
        config: {
          title: "Week Deals",
          subtitle: "Limited time",
          endsAt: new Date(Date.now() + 86400000 * 7).toISOString(),
          productIds: [],
        },
      };
    case "hero_carousel":
      return { ...base, config: { autoplayMs: 5000, slides: [], sideCards: [] } };
    case "promo_tiles":
      return { ...base, config: { cards: [] } };
    case "featured_tabs":
      return { ...base, config: { tabs: parseFeaturedTabs([]) } };
    case "triple_product_lists":
      return {
        ...base,
        config: {
          tabIds: [],
          tripleTabs: parseTripleProductTabs([]),
          sideBannerImageUrl: "/hero-placeholder.svg",
          sideBannerHref: "/",
        },
      };
    case "announcement_bar":
      return { ...base, config: { text: "" } };
    case "footer":
      return {
        ...base,
        config: {
          storeName: "",
          logoUrl: "",
          newsletterText: "Sign up to Newsletter and receive Rs 200 coupon for first shopping.",
          newsletterPlaceholder: "Email address",
          newsletterButtonText: "Sign Up",
          phones: ["+91 77100 12135"],
          address: "",
          columns: [
            {
              title: "Find it Fast",
              links: [],
            },
            {
              title: "Customer Care",
              links: [],
            },
          ],
          socialLinks: [],
        },
      };
    default:
      return base;
  }
}

function summary(section: SectionRow): string {
  const c = section.config;
  switch (section.type) {
    case "category_product_row":
      return `${String(c.title || "")} · ${String(c.categorySlug || "")}`.trim() || "—";
    case "navbar":
      return `${String(c.storeName || "Store name")} · ${String(c.storeTitle || "Store title")} · ${String(c.navbarBg || "#f5c400")}`;
    case "brand_banner":
      return String(c.desktopImageUrl || c.mobileImageUrl || c.imageUrl || "Image banner");
    case "week_deals": {
      const title = String(c.title || "Week deals");
      const productCount = Array.isArray(c.productIds) ? c.productIds.length : 0;
      return `${title} · ${productCount} products`;
    }
    case "top_categories_grid":
      return Array.isArray(c.categorySlugs) ? (c.categorySlugs as string[]).join(", ") || "—" : "—";
    case "brand_logos_strip": {
      const brandItemsCount = Array.isArray(c.brandItems) ? c.brandItems.length : 0;
      const labelsCount = Array.isArray(c.brands) ? c.brands.length : 0;
      return `${brandItemsCount || labelsCount} logos`;
    }
    case "featured_tabs":
      if (Array.isArray(c.tabs)) {
        const tabs = parseFeaturedTabs(c.tabs);
        const counts = tabs.map((tab) => `${tab.title}: ${tab.productIds.length}`).join(" · ");
        return counts || "No tab products selected";
      }
      return "No tab products selected";
    case "triple_product_lists":
      if (Array.isArray(c.tripleTabs)) {
        const tabs = parseTripleProductTabs(c.tripleTabs);
        const counts = tabs.map((tab) => `${tab.title}: ${tab.productIds.length}`).join(" · ");
        return counts || "3-column products";
      }
      return Array.isArray(c.tabIds) && (c.tabIds as string[]).length ? (c.tabIds as string[]).join(", ") : "3-column products";
    case "footer": {
      const name = String(c.storeName || "").trim() || "Footer";
      const columnsCount = Array.isArray(c.columns) ? c.columns.length : 0;
      return `${name} · ${columnsCount} columns`;
    }
    default:
      return "—";
  }
}

function isHeaderType(s: SectionRow) {
  return s.type === "announcement_bar" || s.type === "navbar";
}

function isFooterType(s: SectionRow) {
  return s.type === "footer";
}

function groupLabelForIndex(sorted: SectionRow[], index: number): string | null {
  const row = sorted[index];
  if (!row) return null;
  if (index === 0 && isHeaderType(row)) return "Header";
  if (index === 0 && !isHeaderType(row)) return "Home page";
  if (index > 0 && isHeaderType(sorted[index - 1]!) && !isHeaderType(row)) return "Home page";
  if (index > 0 && !isFooterType(sorted[index - 1]!) && isFooterType(row)) return "Footer";
  return null;
}

export function HomepageSectionsEditor() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const sectionsRef = useRef<SectionRow[]>([]);
  sectionsRef.current = sections;
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [addType, setAddType] = useState<SectionType>("category_product_row");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const sorted = useMemo(
    () => [...sections].filter((section) => section.type !== "promo_tiles").sort((a, b) => a.order - b.order),
    [sections]
  );
  const editing = useMemo(() => sorted.find((s) => s.id === editingId) ?? null, [sorted, editingId]);

  useLayoutEffect(() => {
    document.cookie = "cms_store_preview=1; Path=/; Max-Age=7200; SameSite=Lax";
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const [secRes, catRes, prodRes] = await Promise.all([
        fetch("/api/v1/admin/homepage-sections"),
        fetch("/api/v1/admin/categories"),
        fetch("/api/v1/admin/products"),
      ]);
      const secJson = (await secRes.json()) as { sections?: SectionRow[] };
      const catJson = (await catRes.json()) as { items?: CategoryOption[] };
      const prodJson = (await prodRes.json()) as { items?: ProductApiItem[] };
      const raw = Array.isArray(secJson.sections) ? secJson.sections : [];
      setSections(
        stripLegacyPromoTiles(
          raw.map((row) => ({
            id: String(row.id),
            type: row.type as SectionType,
            order: Number(row.order) || 0,
            enabled: row.enabled !== false,
            config: (row.config && typeof row.config === "object" ? row.config : {}) as Record<string, unknown>,
          }))
        )
      );
      setCategories(
        Array.from(
          new Map(
            (catJson.items ?? [])
              .filter((category) => category.slug && category.name && category.isActive !== false)
              .map((category) => [
                category.slug,
                {
                  _id: String(category._id || ""),
                  slug: category.slug,
                  name: category.name,
                  image: String(category.image || "").trim(),
                  isActive: category.isActive,
                },
              ])
          ).values()
        )
      );
      setProducts(
        (prodJson.items ?? [])
          .map(toProductOption)
          .filter((item): item is ProductOption => Boolean(item))
      );
    } catch {
      setStatus("Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const syncCategoryImage = useCallback(
    async (slug: string, image: string) => {
      const category = categories.find((item) => item.slug === slug);
      if (!category?._id) return { ok: false, error: "Category not found for image sync." };

      try {
        const res = await fetch(`/api/v1/admin/categories/${category._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: image.trim() }),
        });
        const payload = (await res.json().catch(() => null)) as { item?: CategoryOption; error?: string } | null;
        if (!res.ok) {
          return { ok: false, error: payload?.error || "Failed to sync category image." };
        }

        const updatedImage = String(payload?.item?.image ?? image).trim();
        setCategories((prev) =>
          prev.map((item) => (item.slug === slug ? { ...item, image: updatedImage } : item))
        );
        return { ok: true };
      } catch {
        return { ok: false, error: "Failed to sync category image." };
      }
    },
    [categories]
  );

  const bumpPreview = () => setPreviewKey((k) => k + 1);

  const persist = async (): Promise<boolean> => {
    if (document.activeElement instanceof HTMLTextAreaElement) {
      document.activeElement.blur();
    }
    await new Promise((r) => setTimeout(r, 40));
    const normalized = stripLegacyPromoTiles(normalizeOrders(sectionsRef.current));
    setSaving(true);
    setStatus("Saving…");
    try {
      const res = await fetch("/api/v1/admin/homepage-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: normalized }),
      });
      if (!res.ok) {
        setStatus("Save failed.");
        return false;
      }
      setSections(normalized);
      setStatus("Saved.");
      bumpPreview();
      return true;
    } catch {
      setStatus("Save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((items) => {
      const ordered = [...items].sort((a, b) => a.order - b.order);
      const oldIndex = ordered.findIndex((i) => i.id === active.id);
      const newIndex = ordered.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return normalizeOrders(arrayMove(ordered, oldIndex, newIndex));
    });
  };

  const duplicate = (id: string) => {
    const row = sorted.find((s) => s.id === id);
    if (!row) return;
    const clone: SectionRow = {
      ...row,
      id: newId(),
      order: row.order + 5,
      config: JSON.parse(JSON.stringify(row.config)) as Record<string, unknown>,
    };
    setSections(normalizeOrders([...sorted, clone]));
  };

  const remove = (id: string) => {
    setSections(normalizeOrders(sorted.filter((s) => s.id !== id)));
    if (editingId === id) setEditingId(null);
  };

  const toggleEnabled = (id: string) => {
    setSections(sorted.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const resetDefaults = async () => {
    if (!window.confirm("Replace the saved homepage with the built-in default layout?")) return;
    setSaving(true);
    setStatus("Resetting…");
    try {
      const res = await fetch("/api/v1/admin/homepage-sections", { method: "POST" });
      if (!res.ok) {
        setStatus("Reset failed.");
        return;
      }
      const data = (await res.json()) as { sections?: SectionRow[] };
      const raw = Array.isArray(data.sections) ? data.sections : [];
      setSections(
        stripLegacyPromoTiles(
          raw.map((row) => ({
            id: String(row.id),
            type: row.type as SectionType,
            order: Number(row.order) || 0,
            enabled: row.enabled !== false,
            config: (row.config && typeof row.config === "object" ? row.config : {}) as Record<string, unknown>,
          }))
        )
      );
      setStatus("Restored default layout.");
      bumpPreview();
    } finally {
      setSaving(false);
    }
  };

  const patchEditingConfig = (partial: Record<string, unknown>) => {
    if (!editingId) return;
    setSections((prev) => prev.map((s) => (s.id === editingId ? { ...s, config: { ...s.config, ...partial } } : s)));
  };

  const addSection = () => {
    const slug = categories[0]?.slug;
    setSections(normalizeOrders([...sorted, newSection(addType, slug)]));
  };

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-zinc-900 shadow-sm [color-scheme:light] lg:min-h-[calc(100dvh-4.5rem)]">
      <div className="grid min-h-[520px] flex-1 grid-cols-1 divide-y divide-slate-200 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[minmax(280px,400px)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
        {/* Left: theme editor rail */}
        <div className="flex min-h-0 flex-col bg-zinc-50/90">
          <div className="shrink-0 space-y-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">Customize home page</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Drag sections to reorder. Use the eye to hide a block on the storefront. Save applies to the live site (after cache refresh).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={saving}
                onClick={() => void persist()}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={BTN_OUTLINE_SOLID}
                disabled={saving}
                onClick={() => void load()}
              >
                <RefreshCw className="size-3.5" />
                Reload data
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={BTN_OUTLINE_SOLID}
                disabled={saving}
                onClick={() => void resetDefaults()}
              >
                Reset layout
              </Button>
            </div>
            {!sorted.length && !loading ? (
              <p className="rounded-md border border-amber-200/80 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
                No saved layout yet — the store still uses the automatic default. Add sections or reset to persist a layout you can edit here.
              </p>
            ) : null}
            {status ? <p className="text-xs text-slate-600">{status}</p> : null}
          </div>

          <ScrollArea className="min-h-[240px] flex-1 lg:max-h-[calc(100dvh-10rem)]">
            <div className="px-2 py-3">
              {loading ? (
                <p className="px-2 text-xs text-slate-500">Loading sections…</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {sorted.map((row, index) => (
                        <SortableSectionCard
                          key={row.id}
                          section={row}
                          groupLabel={groupLabelForIndex(sorted, index)}
                          onToggle={() => toggleEnabled(row.id)}
                          onEdit={() => setEditingId(row.id)}
                          onDuplicate={() => duplicate(row.id)}
                          onRemove={() => remove(row.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <div className="mt-3 space-y-2 rounded-lg border border-dashed border-slate-300 bg-white/80 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Add section</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={addType} onValueChange={(v) => setAddType(v as SectionType)}>
                    <SelectTrigger className="h-9 bg-white text-left text-sm text-zinc-900">
                      <SelectValue placeholder="Choose type" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-zinc-900">
                      {ADDABLE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {SECTION_SHORT[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" className="shrink-0 gap-1 bg-slate-800 hover:bg-slate-900" onClick={addSection}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right: live preview */}
        <div className="flex min-h-[320px] flex-col bg-slate-200/50 p-3 lg:min-h-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-800">Storefront preview</p>
              <p className="text-[11px] text-slate-500">Signed-in admins can view the store here while editing.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("h-8 gap-1 text-xs", BTN_OUTLINE_SOLID)}
              onClick={bumpPreview}
            >
              <RefreshCw className="size-3.5" />
              Refresh preview
            </Button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-inner">
            <iframe
              key={previewKey}
              title="Storefront preview"
              className="h-full min-h-[480px] w-full lg:min-h-[calc(100dvh-7rem)]"
              src="/"
            />
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(editingId)}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] max-w-2xl overflow-y-auto border border-slate-200 bg-white text-zinc-900 [color-scheme:light] shadow-xl sm:rounded-xl">
          {editing ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-left text-zinc-950">{SECTION_SHORT[editing.type]}</DialogTitle>
                <DialogDescription className="text-left text-xs text-slate-700">{SECTION_HINT[editing.type]}</DialogDescription>
              </DialogHeader>
              <p className="font-mono text-[10px] text-slate-400">{editing.id}</p>
              <SectionConfigForm
                section={editing}
                categories={categories}
                products={products}
                onChange={patchEditingConfig}
                onSyncCategoryImage={syncCategoryImage}
              />
              <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button type="button" variant="outline" size="sm" className={BTN_OUTLINE_SOLID} onClick={() => setEditingId(null)}>
                  Done
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={saving}
                  onClick={() => void persist().then((ok) => ok && setEditingId(null))}
                >
                  Save all
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableSectionCard({
  section,
  groupLabel,
  onToggle,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  section: SectionRow;
  groupLabel: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div>
      {groupLabel ? (
        <p className="mb-1.5 mt-2 first:mt-0 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{groupLabel}</p>
      ) : null}
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow",
          isDragging && "z-20 border-slate-400 shadow-md ring-2 ring-slate-300/40",
          !section.enabled && "opacity-60"
        )}
      >
        <div className="flex items-stretch gap-0">
          <button
            type="button"
            className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center border-r border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <button type="button" className="min-w-0 flex-1 px-2.5 py-2.5 text-left transition hover:bg-slate-50/80" onClick={onEdit}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{SECTION_SHORT[section.type]}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{summary(section)}</p>
              </div>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">{section.type}</span>
            </div>
          </button>
          <div className="flex shrink-0 flex-col border-l border-slate-200">
            <button
              type="button"
              title={section.enabled ? "Visible on store" : "Hidden on store"}
              className={cn(
                "flex h-9 w-10 items-center justify-center border-b border-slate-200 text-xs font-semibold hover:bg-slate-50",
                section.enabled ? "text-emerald-600" : "text-slate-400"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {section.enabled ? "On" : "Off"}
            </button>
            <button
              type="button"
              title="Edit"
              className="flex h-9 w-10 items-center justify-center text-slate-600 hover:bg-slate-50"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              title="Duplicate"
              className="flex h-9 w-10 items-center justify-center text-slate-600 hover:bg-slate-50"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              title="Remove"
              className="flex h-9 w-10 items-center justify-center text-red-600 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 border-t border-slate-200 bg-slate-50/90 px-2 py-1.5">
          <button type="button" className="rounded px-1.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-50" onClick={onEdit}>
            Edit
          </button>
          <span className="text-[10px] text-slate-300">·</span>
          <button type="button" className="rounded px-1.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-50" onClick={onDuplicate}>
            Duplicate
          </button>
          <span className="text-[10px] text-slate-300">·</span>
          <button type="button" className="rounded px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-50" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

type HeroSlideForm = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
};

type CmsImageUploadResult = { imageUrl?: string; error?: string };

async function uploadCmsImage(file: File): Promise<CmsImageUploadResult> {
  const data = new FormData();
  data.append("file", file);

  const res = await fetch("/api/v1/admin/uploads/image", { method: "POST", body: data });
  const payload = (await res.json().catch(() => null)) as CmsImageUploadResult | null;
  if (!res.ok || !payload?.imageUrl) {
    return { error: payload?.error || "Image upload failed" };
  }
  return { imageUrl: payload.imageUrl };
}

function parseHeroSlides(raw: unknown): HeroSlideForm[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      title: String(o.title ?? ""),
      subtitle: String(o.subtitle ?? ""),
      ctaLabel: String(o.ctaLabel ?? o.cta ?? ""),
      ctaHref: String(o.ctaHref ?? o.link ?? o.href ?? ""),
      imageUrl: String(o.imageUrl ?? o.image ?? ""),
    };
  });
}

function HeroSlidesForm({ value, onChange }: { value: unknown; onChange: (slides: HeroSlideForm[]) => void }) {
  const slides = parseHeroSlides(value);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<{ index: number; message: string } | null>(null);
  const setSlide = (index: number, patch: Partial<HeroSlideForm>) => {
    onChange(slides.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const addSlide = () =>
    onChange([...slides, { title: "New slide", subtitle: "", ctaLabel: "Shop now", ctaHref: "/", imageUrl: "" }]);
  const removeSlide = (index: number) => onChange(slides.filter((_, i) => i !== index));
  const moveSlide = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[index], next[j]] = [next[j]!, next[index]!];
    onChange(next);
  };
  const uploadSlideImage = async (index: number, file: File) => {
    setUploadError(null);
    setUploadingIndex(index);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setUploadError({ index, message: uploaded.error || "Image upload failed" });
        return;
      }
      setSlide(index, { imageUrl: uploaded.imageUrl });
    } catch {
      setUploadError({ index, message: "Image upload failed" });
    } finally {
      setUploadingIndex((current) => (current === index ? null : current));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-700">Slides</span>
        <Button type="button" size="sm" variant="outline" className={cn("h-8 text-xs", BTN_OUTLINE_SOLID)} onClick={addSlide}>
          Add slide
        </Button>
      </div>
      {slides.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-xs leading-relaxed text-slate-600">
          No slides here yet — the live site uses the <strong>global</strong> hero slides from settings. Add at least one slide below to override for this hero block.
        </p>
      ) : null}
      {slides.map((slide, index) => (
        <div key={`slide-${index}`} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800">Slide {index + 1}</span>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
                disabled={index === 0}
                onClick={() => moveSlide(index, -1)}
              >
                Move up
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
                disabled={index === slides.length - 1}
                onClick={() => moveSlide(index, 1)}
              >
                Move down
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-7 px-2 text-xs border-red-200 bg-white text-red-700 hover:bg-red-50")}
                onClick={() => removeSlide(index)}
              >
                Remove
              </Button>
            </div>
          </div>
          <input className={FORM_CONTROL} value={slide.title} onChange={(e) => setSlide(index, { title: e.target.value })} placeholder="Title" />
          <textarea
            className={cn(FORM_CONTROL, "min-h-[52px] text-xs")}
            value={slide.subtitle}
            onChange={(e) => setSlide(index, { subtitle: e.target.value })}
            placeholder="Subtitle"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={FORM_CONTROL} value={slide.ctaLabel} onChange={(e) => setSlide(index, { ctaLabel: e.target.value })} placeholder="Button label" />
            <input className={FORM_CONTROL} value={slide.ctaHref} onChange={(e) => setSlide(index, { ctaHref: e.target.value })} placeholder="Button link" />
          </div>
          <input className={FORM_CONTROL} value={slide.imageUrl} onChange={(e) => setSlide(index, { imageUrl: e.target.value })} placeholder="Image URL" />
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
                uploadingIndex === index ? "cursor-not-allowed opacity-70" : ""
              )}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingIndex === index}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void uploadSlideImage(index, file);
                  event.currentTarget.value = "";
                }}
              />
              {uploadingIndex === index ? "Uploading..." : "Upload image"}
            </label>
            {slide.imageUrl ? (
              <a href={slide.imageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
                Open uploaded image
              </a>
            ) : null}
          </div>
          {uploadError?.index === index ? (
            <p className="text-xs font-medium text-red-600">{uploadError.message}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

type PromoCardForm = {
  productId: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
};

function parsePromoCards(raw: unknown): PromoCardForm[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      productId: String(o.productId ?? ""),
      title: String(o.title ?? ""),
      subtitle: String(o.subtitle ?? ""),
      ctaLabel: String(o.ctaLabel ?? "Shop now"),
      ctaHref: String(o.ctaHref ?? o.href ?? o.link ?? "/"),
      imageUrl: String(o.imageUrl ?? o.image ?? ""),
    };
  });
}

function PromoCardsForm({
  value,
  onChange,
  products,
  sectionLabel,
  emptyMessage,
}: {
  value: unknown;
  onChange: (cards: PromoCardForm[]) => void;
  products: ProductOption[];
  sectionLabel?: string;
  emptyMessage?: string;
}) {
  const cards = parsePromoCards(value);
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<{ index: number; message: string } | null>(null);
  const setCard = (index: number, patch: Partial<PromoCardForm>) => {
    onChange(cards.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };
  const addCard = () => {
    if (cards.length >= 3) return;
    onChange([...cards, { productId: "", title: "Promo", subtitle: "", ctaLabel: "Shop now", ctaHref: "/", imageUrl: "" }]);
  };
  const removeCard = (index: number) => onChange(cards.filter((_, i) => i !== index));
  const moveCard = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= cards.length) return;
    const next = [...cards];
    [next[index], next[j]] = [next[j]!, next[index]!];
    onChange(next);
  };
  const uploadCardImage = async (index: number, file: File) => {
    setUploadError(null);
    setUploadingIndex(index);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setUploadError({ index, message: uploaded.error || "Image upload failed" });
        return;
      }
      setCard(index, { imageUrl: uploaded.imageUrl });
    } catch {
      setUploadError({ index, message: "Image upload failed" });
    } finally {
      setUploadingIndex((current) => (current === index ? null : current));
    }
  };
  const setCardProduct = (index: number, productId: string) => {
    if (!productId) {
      setCard(index, { productId: "" });
      return;
    }
    const product = productsById.get(productId);
    if (!product) {
      setCard(index, { productId: "" });
      return;
    }
    setCard(index, {
      productId: product.id,
      title: product.name,
      subtitle: product.partNumber ? `${product.partNumber} · ₹${product.price}` : `₹${product.price}`,
      ctaLabel: cards[index]?.ctaLabel || "Shop now",
      ctaHref: `/products/${product.slug}`,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-700">{sectionLabel || "Promo cards"}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("h-8 text-xs", BTN_OUTLINE_SOLID)}
          disabled={cards.length >= 3}
          onClick={addCard}
        >
          Add card
        </Button>
      </div>
      {cards.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-xs leading-relaxed text-slate-600">
          {emptyMessage || "No cards added yet. Add up to 3 cards (or pick products) to populate the right stack."}
        </p>
      ) : null}
      {cards.map((card, index) => (
        <div key={`card-${index}`} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800">Card {index + 1}</span>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
                disabled={index === 0}
                onClick={() => moveCard(index, -1)}
              >
                Move up
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
                disabled={index === cards.length - 1}
                onClick={() => moveCard(index, 1)}
              >
                Move down
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-7 px-2 text-xs border-red-200 bg-white text-red-700 hover:bg-red-50")}
                onClick={() => removeCard(index)}
              >
                Remove
              </Button>
            </div>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">Select product from database</span>
            <select
              className={cn(FORM_CONTROL, "cursor-pointer")}
              value={card.productId}
              onChange={(e) => setCardProduct(index, e.target.value)}
            >
              <option value="">Custom promo card (manual)</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.partNumber || product.slug})
                </option>
              ))}
            </select>
          </label>
          <input className={FORM_CONTROL} value={card.title} onChange={(e) => setCard(index, { title: e.target.value })} placeholder="Title" />
          <textarea
            className={cn(FORM_CONTROL, "min-h-[44px] text-xs")}
            value={card.subtitle}
            onChange={(e) => setCard(index, { subtitle: e.target.value })}
            placeholder="Subtitle"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={FORM_CONTROL} value={card.ctaLabel} onChange={(e) => setCard(index, { ctaLabel: e.target.value })} placeholder="Button label" />
            <input className={FORM_CONTROL} value={card.ctaHref} onChange={(e) => setCard(index, { ctaHref: e.target.value })} placeholder="Link" />
          </div>
          <input className={FORM_CONTROL} value={card.imageUrl} onChange={(e) => setCard(index, { imageUrl: e.target.value })} placeholder="Image URL" />
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
                uploadingIndex === index ? "cursor-not-allowed opacity-70" : ""
              )}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingIndex === index}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void uploadCardImage(index, file);
                  event.currentTarget.value = "";
                }}
              />
              {uploadingIndex === index ? "Uploading..." : "Upload image"}
            </label>
            {card.imageUrl ? (
              <a href={card.imageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
                Open uploaded image
              </a>
            ) : null}
          </div>
          {uploadError?.index === index ? (
            <p className="text-xs font-medium text-red-600">{uploadError.message}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FeaturedTabsProductsForm({
  value,
  onChange,
  products,
  maxProductsPerTab,
}: {
  value: unknown;
  onChange: (tabs: FeaturedTabConfigForm[]) => void;
  products: ProductOption[];
  maxProductsPerTab?: number;
}) {
  const tabs = parseFeaturedTabs(value);
  const [pendingByTab, setPendingByTab] = useState<Record<string, string>>({});
  const maxProducts = Number.isFinite(maxProductsPerTab) && Number(maxProductsPerTab) > 0
    ? Math.max(1, Math.trunc(Number(maxProductsPerTab)))
    : undefined;
  const sanitizeProducts = (ids: string[]) => {
    const cleaned = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    return maxProducts ? cleaned.slice(0, maxProducts) : cleaned;
  };

  const setTabProducts = (tabIndex: number, updater: (current: string[]) => string[]) => {
    onChange(
      tabs.map((tab, index) => (
        index === tabIndex
          ? {
              ...tab,
              productIds: sanitizeProducts(updater(tab.productIds)),
            }
          : tab
      ))
    );
  };

  const addProduct = (tabIndex: number) => {
    const tab = tabs[tabIndex];
    if (!tab) return;
    if (maxProducts && tab.productIds.length >= maxProducts) return;
    const selectedProductId = pendingByTab[tab.id] ?? "";
    if (!selectedProductId) return;
    setTabProducts(tabIndex, (ids) => [...ids, selectedProductId]);
    setPendingByTab((prev) => ({ ...prev, [tab.id]: "" }));
  };

  const removeProductSlot = (tabIndex: number, productIndex: number) => {
    setTabProducts(tabIndex, (ids) => ids.filter((_, idx) => idx !== productIndex));
  };

  const setProductAt = (tabIndex: number, productIndex: number, productId: string) => {
    setTabProducts(tabIndex, (ids) => ids.map((id, idx) => (idx === productIndex ? productId : id)));
  };

  return (
    <div className="space-y-3">
      {tabs.map((tab, tabIndex) => (
        <div key={tab.id} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-800">{tab.title}</p>
            <div className="flex items-center gap-2">
              <select
                className={cn(FORM_CONTROL, "h-8 w-[220px] cursor-pointer py-1 text-xs")}
                value={pendingByTab[tab.id] ?? ""}
                onChange={(event) => setPendingByTab((prev) => ({ ...prev, [tab.id]: event.target.value }))}
              >
                <option value="">Select product from database</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.partNumber || product.slug})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
                disabled={!pendingByTab[tab.id] || (Boolean(maxProducts) && tab.productIds.length >= (maxProducts || 0))}
                onClick={() => addProduct(tabIndex)}
              >
                Add product
              </Button>
            </div>
          </div>
          {maxProducts ? (
            <p className="text-[11px] text-slate-500">Selected: {tab.productIds.length}/{maxProducts}</p>
          ) : null}

          {tab.productIds.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-white px-2 py-2 text-xs text-slate-600">
              No products selected yet.
            </p>
          ) : null}

          {tab.productIds.map((productId, productIndex) => (
            <div key={`${tab.id}-${productIndex}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <select
                className={cn(FORM_CONTROL, "cursor-pointer")}
                value={productId}
                onChange={(event) => setProductAt(tabIndex, productIndex, event.target.value)}
              >
                <option value="">Select product from database</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.partNumber || product.slug})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-red-200 bg-white px-2 text-xs text-red-700 hover:bg-red-50"
                onClick={() => removeProductSlot(tabIndex, productIndex)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TripleProductListsForm({
  value,
  products,
  onChange,
}: {
  value: Record<string, unknown>;
  products: ProductOption[];
  onChange: (partial: Record<string, unknown>) => void;
}) {
  const sideBannerImageUrl = String(value.sideBannerImageUrl ?? "/hero-placeholder.svg");
  const sideBannerHref = String(value.sideBannerHref ?? "/");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);

  const uploadBannerImage = async (file: File) => {
    setBannerUploadError(null);
    setUploadingBanner(true);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setBannerUploadError(uploaded.error || "Image upload failed");
        return;
      }
      onChange({ sideBannerImageUrl: uploaded.imageUrl });
    } catch {
      setBannerUploadError("Image upload failed");
    } finally {
      setUploadingBanner(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-600">
        Select exactly up to 3 products for Featured, On Sale, and Top Rated in this section.
      </p>
      <FeaturedTabsProductsForm
        value={value.tripleTabs}
        products={products}
        maxProductsPerTab={3}
        onChange={(tripleTabs) => onChange({ tripleTabs })}
      />
      <div className="grid gap-2 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Right side banner image URL / URI</span>
          <input
            className={FORM_CONTROL}
            value={sideBannerImageUrl}
            onChange={(event) => onChange({ sideBannerImageUrl: event.target.value })}
            placeholder="https://..."
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Right side banner link</span>
          <input
            className={FORM_CONTROL}
            value={sideBannerHref}
            onChange={(event) => onChange({ sideBannerHref: event.target.value })}
            placeholder="/"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
            uploadingBanner ? "cursor-not-allowed opacity-70" : ""
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingBanner}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void uploadBannerImage(file);
              event.currentTarget.value = "";
            }}
          />
          {uploadingBanner ? "Uploading..." : "Upload banner image"}
        </label>
        {sideBannerImageUrl ? (
          <a href={sideBannerImageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
            Open banner image
          </a>
        ) : null}
      </div>
      {bannerUploadError ? <p className="text-xs font-medium text-red-600">{bannerUploadError}</p> : null}
    </div>
  );
}

function WeekDealsProductsForm({
  value,
  onChange,
  products,
}: {
  value: unknown;
  onChange: (productIds: string[]) => void;
  products: ProductOption[];
}) {
  const productIds = useMemo(() => parseProductIds(value), [value]);
  const [pendingProductId, setPendingProductId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [knownProducts, setKnownProducts] = useState<ProductOption[]>(products);
  const normalizedSearch = searchQuery.trim();

  useEffect(() => {
    setKnownProducts((prev) => mergeProductOptions(prev, products));
  }, [products]);

  const knownOptionPool = useMemo(
    () => mergeProductOptions(products, knownProducts, searchResults),
    [products, knownProducts, searchResults]
  );

  useEffect(() => {
    const missingSelectedIds = productIds.filter((productId) => !knownOptionPool.some((item) => item.id === productId));
    if (!missingSelectedIds.length) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/v1/admin/products?ids=${encodeURIComponent(missingSelectedIds.join(","))}&limit=${Math.min(200, missingSelectedIds.length)}`,
          { signal: controller.signal, cache: "no-store" }
        );
        const payload = (await res.json().catch(() => ({}))) as { items?: ProductApiItem[] };
        const fetched = (payload.items ?? [])
          .map(toProductOption)
          .filter((item): item is ProductOption => Boolean(item));
        if (!controller.signal.aborted && fetched.length) {
          setKnownProducts((prev) => mergeProductOptions(prev, fetched));
        }
      } catch {
        // Ignore fetch failures and keep placeholder entries for unresolved IDs.
      }
    })();

    return () => {
      controller.abort();
    };
  }, [productIds, knownOptionPool]);

  useEffect(() => {
    if (!normalizedSearch) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/v1/admin/products?q=${encodeURIComponent(normalizedSearch)}&limit=200`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await res.json().catch(() => ({}))) as { items?: ProductApiItem[] };
        const fetched = (payload.items ?? [])
          .map(toProductOption)
          .filter((item): item is ProductOption => Boolean(item));
        setSearchResults(fetched);
        setKnownProducts((prev) => mergeProductOptions(prev, fetched));
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalizedSearch]);

  const baseSelectableProducts = normalizedSearch ? searchResults : knownOptionPool;
  const selectedPendingProduct = knownOptionPool.find((product) => product.id === pendingProductId);
  const selectableProducts = selectedPendingProduct && !baseSelectableProducts.some((product) => product.id === selectedPendingProduct.id)
    ? [selectedPendingProduct, ...baseSelectableProducts]
    : baseSelectableProducts;
  const selectOptions = mergeProductOptions(
    knownOptionPool,
    productIds
      .filter((productId) => !knownOptionPool.some((item) => item.id === productId))
      .map((productId) => ({
        id: productId,
        name: `Product (${productId.slice(0, 8)}...)`,
        slug: productId,
        partNumber: "Unknown",
        imageUrl: "",
        price: 0,
      }))
  );

  const addProduct = () => {
    if (!pendingProductId) return;
    onChange(Array.from(new Set([...productIds, pendingProductId])));
    setPendingProductId("");
    setSearchQuery("");
  };

  const removeProductSlot = (index: number) => {
    onChange(productIds.filter((_, idx) => idx !== index));
  };

  const setProductAt = (index: number, productId: string) => {
    onChange(Array.from(new Set(productIds.map((id, idx) => (idx === index ? productId : id)).filter(Boolean))));
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">Week deals products</p>
        <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(240px,1fr)_auto] sm:items-center">
          <input
            className={cn(FORM_CONTROL, "h-8 py-1 text-xs")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search product name in database"
          />
          <select
            className={cn(FORM_CONTROL, "h-8 cursor-pointer py-1 text-xs")}
            value={pendingProductId}
            onChange={(event) => setPendingProductId(event.target.value)}
          >
            <option value="">Select product from dropdown</option>
            {selectableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.partNumber || product.slug})
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
            disabled={!pendingProductId}
            onClick={addProduct}
          >
            Add product
          </Button>
        </div>
      </div>
      {normalizedSearch && searchLoading ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-white px-2 py-2 text-xs text-slate-600">
          Searching products...
        </p>
      ) : null}
      {normalizedSearch && !searchLoading && selectableProducts.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-white px-2 py-2 text-xs text-slate-600">
          No products found for this search.
        </p>
      ) : null}

      {productIds.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-white px-2 py-2 text-xs text-slate-600">
          No products selected yet. Storefront will automatically show fallback week-deal products.
        </p>
      ) : null}

      {productIds.map((productId, productIndex) => (
        <div key={`week-deal-${productIndex}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <select
            className={cn(FORM_CONTROL, "cursor-pointer")}
            value={productId}
            onChange={(event) => setProductAt(productIndex, event.target.value)}
          >
            <option value="">Select product from database</option>
            {selectOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.partNumber || product.slug})
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-red-200 bg-white px-2 text-xs text-red-700 hover:bg-red-50"
            onClick={() => removeProductSlot(productIndex)}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

function TopCategoriesGridForm({
  value,
  categories,
  onChange,
  onSyncCategoryImage,
}: {
  value: Record<string, unknown>;
  categories: CategoryOption[];
  onChange: (partial: Record<string, unknown>) => void;
  onSyncCategoryImage: (slug: string, image: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const selectedCategorySlugs = Array.isArray(value.categorySlugs)
    ? Array.from(
        new Set(
          value.categorySlugs
            .map((slug) => String(slug).trim())
            .filter(Boolean)
        )
      ).slice(0, 10)
    : [];
  const [pendingCategorySlug, setPendingCategorySlug] = useState("");
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageDraftBySlug, setImageDraftBySlug] = useState<Record<string, string>>({});
  const selectedSet = new Set(selectedCategorySlugs);
  const addableCategories = categories.filter((category) => !selectedSet.has(category.slug));
  const categoryImageBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, String(category.image ?? "").trim()])),
    [categories]
  );

  const patchConfig = (nextSlugs: string[]) => {
    const normalizedSlugs = Array.from(new Set(nextSlugs.map((slug) => slug.trim()).filter(Boolean))).slice(0, 10);
    onChange({
      categorySlugs: normalizedSlugs,
      categoryImages: {},
    });
  };

  useEffect(() => {
    if (!pendingCategorySlug && addableCategories.length > 0) {
      setPendingCategorySlug(addableCategories[0]!.slug);
      return;
    }
    if (pendingCategorySlug && !addableCategories.some((category) => category.slug === pendingCategorySlug)) {
      setPendingCategorySlug(addableCategories[0]?.slug || "");
    }
  }, [addableCategories, pendingCategorySlug]);

  const patchAt = (index: number, nextSlug: string) => {
    if (!nextSlug) return;
    const nextSlugs = selectedCategorySlugs.map((slug, currentIndex) => (currentIndex === index ? nextSlug : slug));
    patchConfig(nextSlugs);
  };

  const removeAt = (index: number) => {
    const nextSlugs = selectedCategorySlugs.filter((_, currentIndex) => currentIndex !== index);
    patchConfig(nextSlugs);
  };

  const addCategory = () => {
    if (!pendingCategorySlug || selectedCategorySlugs.length >= 10) return;
    patchConfig([...selectedCategorySlugs, pendingCategorySlug].slice(0, 10));
  };

  const patchImageDraftForSlug = (slug: string, image: string) => {
    setImageDraftBySlug((prev) => ({ ...prev, [slug]: image }));
  };

  const getImageForSlug = (slug: string) => String(imageDraftBySlug[slug] ?? categoryImageBySlug.get(slug) ?? "").trim();

  const syncImageForSlug = async (slug: string) => {
    setUploadError(null);
    setSavingSlug(slug);
    try {
      const image = getImageForSlug(slug);
      const result = await onSyncCategoryImage(slug, image);
      if (!result.ok) {
        setUploadError(result.error || "Failed to sync category image");
        return;
      }
      setImageDraftBySlug((prev) => ({ ...prev, [slug]: image }));
    } catch {
      setUploadError("Failed to sync category image");
    } finally {
      setSavingSlug((current) => (current === slug ? null : current));
    }
  };

  const uploadCategoryImage = async (slug: string, file: File) => {
    setUploadError(null);
    setUploadingSlug(slug);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setUploadError(uploaded.error || "Image upload failed");
        return;
      }
      setImageDraftBySlug((prev) => ({ ...prev, [slug]: uploaded.imageUrl! }));
      const result = await onSyncCategoryImage(slug, uploaded.imageUrl);
      if (!result.ok) {
        setUploadError(result.error || "Failed to sync category image");
      }
    } catch {
      setUploadError("Image upload failed");
    } finally {
      setUploadingSlug((current) => (current === slug ? null : current));
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <select
          className={cn(FORM_CONTROL, "h-8 cursor-pointer py-1 text-xs")}
          value={pendingCategorySlug}
          onChange={(event) => setPendingCategorySlug(event.target.value)}
          disabled={selectedCategorySlugs.length >= 10 || addableCategories.length === 0}
        >
          {addableCategories.length === 0 ? (
            <option value="">No more categories available</option>
          ) : null}
          {addableCategories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name} ({category.slug})
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
          disabled={!pendingCategorySlug || selectedCategorySlugs.length >= 10}
          onClick={addCategory}
        >
          Add category
        </Button>
      </div>

      {selectedCategorySlugs.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-white px-2 py-2 text-xs text-slate-600">
          No categories selected yet. Storefront will automatically show top categories from database.
        </p>
      ) : null}

      <p className="text-[11px] text-slate-500">Selected: {selectedCategorySlugs.length}/10 categories.</p>
      <p className="text-[11px] text-slate-500">Image updates here sync with Categories CMS.</p>

      {selectedCategorySlugs.map((slug, index) => {
        const category = categories.find((item) => item.slug === slug);
        const optionsForSlot = category
          ? [category, ...categories.filter((item) => item.slug !== category.slug)]
          : [{ slug, name: `Unknown (${slug})` }, ...categories];
        const imageUrl = getImageForSlug(slug);
        const isSyncing = savingSlug === slug;
        const isUploading = uploadingSlug === slug;
        return (
          <div key={`top-category-${index}`} className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <select
                className={cn(FORM_CONTROL, "cursor-pointer")}
                value={slug}
                onChange={(event) => patchAt(index, event.target.value)}
              >
                {optionsForSlot.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name} ({option.slug})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-red-200 bg-white px-2 text-xs text-red-700 hover:bg-red-50"
                onClick={() => removeAt(index)}
              >
                Remove
              </Button>
            </div>
            <input
              className={cn(FORM_CONTROL, "text-xs")}
              value={imageUrl}
              onChange={(event) => patchImageDraftForSlug(slug, event.target.value)}
              placeholder="Image URL / URI (https://...)"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-8 px-2 text-xs", BTN_OUTLINE_SOLID)}
                disabled={isSyncing || isUploading}
                onClick={() => void syncImageForSlug(slug)}
              >
                {isSyncing ? "Saving..." : "Save image"}
              </Button>
              <label
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
                  isUploading || isSyncing ? "cursor-not-allowed opacity-70" : ""
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading || isSyncing}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void uploadCategoryImage(slug, file);
                    event.currentTarget.value = "";
                  }}
                />
                {isUploading ? "Uploading..." : "Upload image"}
              </label>
              {imageUrl ? (
                <a href={imageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
                  Open image
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
      {uploadError ? <p className="text-xs font-medium text-red-600">{uploadError}</p> : null}
    </div>
  );
}

type BrandLogoEditorItem = {
  label: string;
  href: string;
  grayLogoUrl: string;
  colorLogoUrl: string;
};

function BrandLogosStripForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}) {
  const parsedItems = (() => {
    const explicit = Array.isArray(value.brandItems)
      ? value.brandItems
        .map((item) => {
          const brand = item && typeof item === "object" ? item as Record<string, unknown> : {};
          return {
            label: String(brand.label || "").trim(),
            href: String(brand.href || "").trim(),
            grayLogoUrl: String(brand.grayLogoUrl || "").trim(),
            colorLogoUrl: String(brand.colorLogoUrl || "").trim(),
          };
        })
      : [];
    if (explicit.length) return explicit;
    const legacy = Array.isArray(value.brands)
      ? value.brands
        .map((brand) => String(brand || "").trim())
        .filter(Boolean)
        .map((label) => ({
          label,
          href: "",
          grayLogoUrl: "",
          colorLogoUrl: "",
        }))
      : [];
    return legacy;
  })();
  const displayItems = parsedItems.length
    ? parsedItems
    : [{ label: "", href: "", grayLogoUrl: "", colorLogoUrl: "" }];
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const patchItems = (nextItems: BrandLogoEditorItem[]) => {
    const normalized = nextItems
      .map((item) => ({
        label: String(item.label || "").trim(),
        href: String(item.href || "").trim(),
        grayLogoUrl: String(item.grayLogoUrl || "").trim(),
        colorLogoUrl: String(item.colorLogoUrl || "").trim(),
      }))
      .slice(0, 20);
    onChange({
      brandItems: normalized,
      brands: normalized.map((item) => item.label).filter(Boolean),
    });
  };

  const patchAt = (index: number, patch: Partial<BrandLogoEditorItem>) => {
    const next = [...displayItems];
    next[index] = { ...next[index], ...patch };
    patchItems(next);
  };

  const removeAt = (index: number) => {
    const next = displayItems.filter((_, currentIndex) => currentIndex !== index);
    patchItems(next);
  };

  const addItem = () => {
    patchItems([...displayItems, { label: "", href: "", grayLogoUrl: "", colorLogoUrl: "" }]);
  };

  const uploadLogo = async (index: number, target: "grayLogoUrl" | "colorLogoUrl", file: File) => {
    const slot = `${index}-${target}`;
    setUploadError(null);
    setUploadingSlot(slot);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setUploadError(uploaded.error || "Image upload failed");
        return;
      }
      patchAt(index, target === "grayLogoUrl"
        ? { grayLogoUrl: uploaded.imageUrl }
        : { colorLogoUrl: uploaded.imageUrl });
    } catch {
      setUploadError("Image upload failed");
    } finally {
      setUploadingSlot((current) => (current === slot ? null : current));
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">Brand logos</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
          onClick={addItem}
        >
          Add brand logo
        </Button>
      </div>

      {displayItems.map((item, index) => (
        <div key={`brand-logo-${index}`} className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
            <input
              className={FORM_CONTROL}
              value={item.label}
              onChange={(event) => patchAt(index, { label: event.target.value })}
              placeholder="Brand label (e.g. Everstar)"
            />
            <input
              className={FORM_CONTROL}
              value={item.href}
              onChange={(event) => patchAt(index, { href: event.target.value })}
              placeholder="Brand link (optional, e.g. /brands/everstar)"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-red-200 bg-white px-2 text-xs text-red-700 hover:bg-red-50"
              onClick={() => removeAt(index)}
              disabled={displayItems.length <= 1 && !item.label && !item.grayLogoUrl && !item.colorLogoUrl}
            >
              Remove
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-2">
              <input
                className={cn(FORM_CONTROL, "text-xs")}
                value={item.grayLogoUrl}
                onChange={(event) => patchAt(index, { grayLogoUrl: event.target.value })}
                placeholder="Gray logo image URL / URI"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
                    uploadingSlot === `${index}-grayLogoUrl` ? "cursor-not-allowed opacity-70" : ""
                  )}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingSlot === `${index}-grayLogoUrl`}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) void uploadLogo(index, "grayLogoUrl", file);
                      event.currentTarget.value = "";
                    }}
                  />
                  {uploadingSlot === `${index}-grayLogoUrl` ? "Uploading..." : "Upload gray logo"}
                </label>
                {item.grayLogoUrl ? (
                  <a href={item.grayLogoUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
                    Open gray logo
                  </a>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <input
                className={cn(FORM_CONTROL, "text-xs")}
                value={item.colorLogoUrl}
                onChange={(event) => patchAt(index, { colorLogoUrl: event.target.value })}
                placeholder="Color logo image URL / URI (hover)"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
                    uploadingSlot === `${index}-colorLogoUrl` ? "cursor-not-allowed opacity-70" : ""
                  )}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingSlot === `${index}-colorLogoUrl`}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) void uploadLogo(index, "colorLogoUrl", file);
                      event.currentTarget.value = "";
                    }}
                  />
                  {uploadingSlot === `${index}-colorLogoUrl` ? "Uploading..." : "Upload color logo"}
                </label>
                {item.colorLogoUrl ? (
                  <a href={item.colorLogoUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
                    Open color logo
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ))}

      {uploadError ? <p className="text-xs font-medium text-red-600">{uploadError}</p> : null}
      <p className="text-[11px] text-slate-500">
        Use gray logo as default and color logo for hover state. If color logo is empty, gray logo will be shown with grayscale hover effect.
      </p>
    </div>
  );
}

function BrandBannerMediaForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}) {
  const desktopImageUrl = String(value.desktopImageUrl ?? value.imageUrl ?? "");
  const mobileImageUrl = String(value.mobileImageUrl ?? desktopImageUrl);
  const href = String(value.href ?? "/");
  const [uploadingTarget, setUploadingTarget] = useState<"desktop" | "mobile" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadBannerImage = async (target: "desktop" | "mobile", file: File) => {
    setUploadError(null);
    setUploadingTarget(target);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setUploadError(uploaded.error || "Image upload failed");
        return;
      }

      if (target === "desktop") {
        onChange({ desktopImageUrl: uploaded.imageUrl, imageUrl: uploaded.imageUrl });
        return;
      }

      onChange({ mobileImageUrl: uploaded.imageUrl });
    } catch {
      setUploadError("Image upload failed");
    } finally {
      setUploadingTarget((current) => (current === target ? null : current));
    }
  };

  return (
    <div className="mt-3 grid gap-3">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-700">Link href</span>
        <input className={FORM_CONTROL} value={href} onChange={(e) => onChange({ href: e.target.value })} />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-700">Desktop image URL</span>
        <input
          className={FORM_CONTROL}
          value={desktopImageUrl}
          onChange={(e) => onChange({ desktopImageUrl: e.target.value, imageUrl: e.target.value })}
          placeholder="Used on large screens (lg and above)"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
            uploadingTarget === "desktop" ? "cursor-not-allowed opacity-70" : ""
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingTarget === "desktop"}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void uploadBannerImage("desktop", file);
              event.currentTarget.value = "";
            }}
          />
          {uploadingTarget === "desktop" ? "Uploading..." : "Upload desktop image"}
        </label>
        {desktopImageUrl ? (
          <a href={desktopImageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
            Open desktop image
          </a>
        ) : null}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-700">Mobile image URL</span>
        <input
          className={FORM_CONTROL}
          value={mobileImageUrl}
          onChange={(e) => onChange({ mobileImageUrl: e.target.value })}
          placeholder="Used on mobile/tablet (below lg)"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
            uploadingTarget === "mobile" ? "cursor-not-allowed opacity-70" : ""
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingTarget === "mobile"}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void uploadBannerImage("mobile", file);
              event.currentTarget.value = "";
            }}
          />
          {uploadingTarget === "mobile" ? "Uploading..." : "Upload mobile image"}
        </label>
        {mobileImageUrl ? (
          <a href={mobileImageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
            Open mobile image
          </a>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">
        Banner is image-only. Mobile image is shown below lg; desktop image is shown on lg and larger screens.
      </p>
      {uploadError ? <p className="text-xs font-medium text-red-600">{uploadError}</p> : null}
    </div>
  );
}

type FooterLinkEditorItem = { label: string; href: string };
type FooterColumnEditorItem = { title: string; links: FooterLinkEditorItem[] };
type FooterSocialEditorItem = { platform: string; url: string; logoUrl: string };

function parseFooterColumns(raw: unknown): FooterColumnEditorItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((column) => {
      const item = column && typeof column === "object" && !Array.isArray(column) ? column as Record<string, unknown> : {};
      return {
        title: String(item.title || "").trim(),
        links: Array.isArray(item.links)
          ? item.links
              .map((link) => {
                const typed = link && typeof link === "object" && !Array.isArray(link) ? link as Record<string, unknown> : {};
                return {
                  label: String(typed.label || "").trim(),
                  href: String(typed.href || "").trim(),
                };
              })
              .filter((link) => link.label || link.href)
          : [],
      };
    })
    .filter((column) => column.title || column.links.length);
}

function parseFooterSocialLinks(raw: unknown): FooterSocialEditorItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const typed = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
      return {
        platform: String(typed.platform || "").trim(),
        url: String(typed.url || "").trim(),
        logoUrl: String(typed.logoUrl || "").trim(),
      };
    })
    .filter((item) => item.platform || item.url || item.logoUrl);
}

function FooterConfigForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}) {
  const parsedColumns = parseFooterColumns(value.columns);
  const columns: FooterColumnEditorItem[] = [
    parsedColumns[0] ?? { title: "Find it Fast", links: [] },
    parsedColumns[1] ?? { title: "Customer Care", links: [] },
  ];
  const parsedSocialLinks = parseFooterSocialLinks(value.socialLinks);
  const socialLinks = parsedSocialLinks.length ? parsedSocialLinks : [{ platform: "", url: "", logoUrl: "" }];
  const phones = Array.isArray(value.phones)
    ? value.phones.map((phone) => String(phone || "").trim()).filter(Boolean)
    : [];
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSocialLogoSlot, setUploadingSocialLogoSlot] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const patchColumns = (nextColumns: FooterColumnEditorItem[]) => {
    onChange({
      columns: nextColumns.map((column) => ({
        title: String(column.title || "").trim(),
        links: column.links
          .map((link) => ({
            label: String(link.label || "").trim(),
            href: String(link.href || "").trim(),
          }))
          .filter((link) => link.label || link.href),
      })),
    });
  };

  const patchColumn = (columnIndex: number, patch: Partial<FooterColumnEditorItem>) => {
    const nextColumns = [...columns];
    nextColumns[columnIndex] = { ...nextColumns[columnIndex], ...patch };
    patchColumns(nextColumns);
  };

  const patchColumnLinks = (columnIndex: number, nextLinks: FooterLinkEditorItem[]) => {
    patchColumn(columnIndex, { links: nextLinks });
  };

  const patchSocialLinks = (nextLinks: FooterSocialEditorItem[]) => {
    onChange({
      socialLinks: nextLinks
        .map((item) => ({
          platform: String(item.platform || "").trim(),
          url: String(item.url || "").trim(),
          logoUrl: String(item.logoUrl || "").trim(),
        }))
        .filter((item) => item.platform || item.url || item.logoUrl),
    });
  };

  const uploadLogo = async (file: File) => {
    setUploadError(null);
    setUploadingLogo(true);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setUploadError(uploaded.error || "Image upload failed");
        return;
      }
      onChange({ logoUrl: uploaded.imageUrl });
    } catch {
      setUploadError("Image upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const uploadSocialLogo = async (index: number, file: File) => {
    setUploadError(null);
    setUploadingSocialLogoSlot(index);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setUploadError(uploaded.error || "Image upload failed");
        return;
      }
      const next = [...socialLinks];
      next[index] = { ...next[index], logoUrl: uploaded.imageUrl };
      patchSocialLinks(next);
    } catch {
      setUploadError("Image upload failed");
    } finally {
      setUploadingSocialLogoSlot((current) => (current === index ? null : current));
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Store name</span>
          <input
            className={FORM_CONTROL}
            value={String(value.storeName ?? "")}
            onChange={(event) => onChange({ storeName: event.target.value })}
            placeholder="Lumenskart"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Footer logo image URL / URI</span>
          <input
            className={FORM_CONTROL}
            value={String(value.logoUrl ?? "")}
            onChange={(event) => onChange({ logoUrl: event.target.value })}
            placeholder="https://..."
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
            uploadingLogo ? "cursor-not-allowed opacity-70" : ""
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingLogo}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void uploadLogo(file);
              event.currentTarget.value = "";
            }}
          />
          {uploadingLogo ? "Uploading..." : "Upload footer logo"}
        </label>
        {String(value.logoUrl ?? "").trim() ? (
          <a href={String(value.logoUrl)} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
            Open footer logo
          </a>
        ) : null}
      </div>
      {uploadError ? <p className="text-xs font-medium text-red-600">{uploadError}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block space-y-1 md:col-span-3">
          <span className="text-xs font-medium text-slate-700">Newsletter bar text</span>
          <input
            className={FORM_CONTROL}
            value={String(value.newsletterText ?? "")}
            onChange={(event) => onChange({ newsletterText: event.target.value })}
            placeholder="Sign up to Newsletter and receive Rs 200 coupon for first shopping."
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Newsletter input placeholder</span>
          <input
            className={FORM_CONTROL}
            value={String(value.newsletterPlaceholder ?? "")}
            onChange={(event) => onChange({ newsletterPlaceholder: event.target.value })}
            placeholder="Email address"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Newsletter button label</span>
          <input
            className={FORM_CONTROL}
            value={String(value.newsletterButtonText ?? "")}
            onChange={(event) => onChange({ newsletterButtonText: event.target.value })}
            placeholder="Sign Up"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Phone numbers (one per line)</span>
          <textarea
            className={cn(FORM_CONTROL, "min-h-[90px] text-xs")}
            value={phones.join("\n")}
            onChange={(event) =>
              onChange({
                phones: event.target.value
                  .split(/\n|,/)
                  .map((entry) => entry.trim())
                  .filter(Boolean),
              })
            }
            placeholder="+91 77100 12135"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Address</span>
          <textarea
            className={cn(FORM_CONTROL, "min-h-[90px] text-xs")}
            value={String(value.address ?? "")}
            onChange={(event) => onChange({ address: event.target.value })}
            placeholder="Full office/store address"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {columns.map((column, columnIndex) => {
          const displayLinks = column.links.length ? column.links : [{ label: "", href: "" }];
          return (
            <div key={`footer-column-${columnIndex}`} className="space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800">Footer links column {columnIndex + 1}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
                  onClick={() => patchColumnLinks(columnIndex, [...column.links, { label: "New link", href: "/" }])}
                >
                  Add link
                </Button>
              </div>
              <input
                className={FORM_CONTROL}
                value={column.title}
                onChange={(event) => patchColumn(columnIndex, { title: event.target.value })}
                placeholder={columnIndex === 0 ? "Find it Fast" : "Customer Care"}
              />
              {displayLinks.map((link, linkIndex) => (
                <div key={`footer-column-${columnIndex}-link-${linkIndex}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    className={FORM_CONTROL}
                    value={link.label}
                    onChange={(event) => {
                      const next = [...displayLinks];
                      next[linkIndex] = { ...link, label: event.target.value };
                      patchColumnLinks(columnIndex, next);
                    }}
                    placeholder="Link label"
                  />
                  <input
                    className={FORM_CONTROL}
                    value={link.href}
                    onChange={(event) => {
                      const next = [...displayLinks];
                      next[linkIndex] = { ...link, href: event.target.value };
                      patchColumnLinks(columnIndex, next);
                    }}
                    placeholder="/path"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn("h-10 border-red-200 bg-white text-red-700 hover:bg-red-50 sm:h-auto", BTN_OUTLINE_SOLID)}
                    onClick={() => patchColumnLinks(columnIndex, displayLinks.filter((_, index) => index !== linkIndex))}
                    disabled={displayLinks.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-800">Social links</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-7 px-2 text-xs", BTN_OUTLINE_SOLID)}
            onClick={() => patchSocialLinks([...parsedSocialLinks, { platform: "facebook", url: "https://", logoUrl: "" }])}
          >
            Add social
          </Button>
        </div>
        {socialLinks.map((item, index) => (
          <div key={`footer-social-${index}`} className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input
                className={FORM_CONTROL}
                value={item.platform}
                onChange={(event) => {
                  const next = [...socialLinks];
                  next[index] = { ...item, platform: event.target.value };
                  patchSocialLinks(next);
                }}
                placeholder="Social name (facebook)"
              />
              <input
                className={FORM_CONTROL}
                value={item.url}
                onChange={(event) => {
                  const next = [...socialLinks];
                  next[index] = { ...item, url: event.target.value };
                  patchSocialLinks(next);
                }}
                placeholder="https://..."
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-10 border-red-200 bg-white text-red-700 hover:bg-red-50 sm:h-auto", BTN_OUTLINE_SOLID)}
                onClick={() => patchSocialLinks(socialLinks.filter((_, current) => current !== index))}
                disabled={socialLinks.length <= 1}
              >
                Remove
              </Button>
            </div>
            <input
              className={cn(FORM_CONTROL, "text-xs")}
              value={item.logoUrl}
              onChange={(event) => {
                const next = [...socialLinks];
                next[index] = { ...item, logoUrl: event.target.value };
                patchSocialLinks(next);
              }}
              placeholder="Social logo image URL / URI (optional)"
            />
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
                  uploadingSocialLogoSlot === index ? "cursor-not-allowed opacity-70" : ""
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingSocialLogoSlot === index}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void uploadSocialLogo(index, file);
                    event.currentTarget.value = "";
                  }}
                />
                {uploadingSocialLogoSlot === index ? "Uploading..." : "Upload social logo"}
              </label>
              {item.logoUrl ? (
                <a href={item.logoUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
                  Open social logo
                </a>
              ) : null}
              <span className="text-[11px] text-slate-500">Use logo image OR social name.</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-500">
        Saving this section also updates the live global footer used across the storefront.
      </p>
    </div>
  );
}

function colorPickerValue(value: unknown, fallback = "#f5c400") {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return fallback;
  const hex = match[1]!;
  if (hex.length === 6) return `#${hex.toLowerCase()}`;
  const expanded = hex
    .split("")
    .map((ch) => `${ch}${ch}`)
    .join("")
    .toLowerCase();
  return `#${expanded}`;
}

function SectionConfigForm({
  section,
  categories,
  products,
  onChange,
  onSyncCategoryImage,
}: {
  section: SectionRow;
  categories: CategoryOption[];
  products: ProductOption[];
  onChange: (partial: Record<string, unknown>) => void;
  onSyncCategoryImage: (slug: string, image: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const c = section.config;
  const [categoryPromoUploading, setCategoryPromoUploading] = useState(false);
  const [categoryPromoUploadError, setCategoryPromoUploadError] = useState<string | null>(null);
  const [navbarFaviconUploading, setNavbarFaviconUploading] = useState(false);
  const [navbarFaviconUploadError, setNavbarFaviconUploadError] = useState<string | null>(null);
  const categoryAnchorLinks = (() => {
    const links = Array.isArray(c.anchorLinks)
      ? c.anchorLinks.map((item) => {
          const anchor = item && typeof item === "object" ? item as Record<string, unknown> : {};
          return {
            title: String(anchor.title || "").trim(),
            href: String(anchor.href || "").trim(),
          };
        })
      : [];
    const fallbackTitle = String(c.anchorTitle || "").trim();
    const fallbackHref = String(c.anchorHref || "").trim();
    if (!links.length && fallbackTitle && fallbackHref) {
      links.push({ title: fallbackTitle, href: fallbackHref });
    }
    return links;
  })();
  const displayedCategoryAnchorLinks = categoryAnchorLinks.length
    ? categoryAnchorLinks
    : [{ title: "", href: "" }];

  const uploadCategoryPromoImage = async (file: File) => {
    setCategoryPromoUploadError(null);
    setCategoryPromoUploading(true);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setCategoryPromoUploadError(uploaded.error || "Image upload failed");
        return;
      }
      onChange({ promoImageUrl: uploaded.imageUrl });
    } catch {
      setCategoryPromoUploadError("Image upload failed");
    } finally {
      setCategoryPromoUploading(false);
    }
  };

  const patchCategoryAnchorLinks = (nextLinks: Array<{ title: string; href: string }>) => {
    const normalized = nextLinks.map((link) => ({
      title: String(link.title || "").trim(),
      href: String(link.href || "").trim(),
    }));
    const firstComplete = normalized.find((link) => link.title && link.href);
    onChange({
      anchorLinks: normalized,
      anchorTitle: firstComplete?.title || "",
      anchorHref: firstComplete?.href || "",
    });
  };

  const uploadNavbarFavicon = async (file: File) => {
    setNavbarFaviconUploadError(null);
    setNavbarFaviconUploading(true);
    try {
      const uploaded = await uploadCmsImage(file);
      if (!uploaded.imageUrl) {
        setNavbarFaviconUploadError(uploaded.error || "Favicon upload failed");
        return;
      }
      onChange({ favicon: uploaded.imageUrl });
    } catch {
      setNavbarFaviconUploadError("Favicon upload failed");
    } finally {
      setNavbarFaviconUploading(false);
    }
  };

  const text = (key: string, label: string, placeholder?: string) => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <input
        className={FORM_CONTROL}
        value={String(c[key] ?? "")}
        onChange={(e) => onChange({ [key]: e.target.value })}
        placeholder={placeholder}
      />
    </label>
  );

  const textarea = (key: string, label: string) => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <textarea
        className={cn(FORM_CONTROL, "min-h-[72px] font-mono text-xs")}
        value={String(c[key] ?? "")}
        onChange={(e) => onChange({ [key]: e.target.value })}
      />
    </label>
  );

  const num = (key: string, label: string) => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <input
        type="number"
        className={cn(FORM_CONTROL, "max-w-xs")}
        value={c[key] === undefined || c[key] === null ? "" : String(c[key])}
        onChange={(e) => onChange({ [key]: e.target.value === "" ? undefined : Number(e.target.value) })}
      />
    </label>
  );

  const slugListField = (key: string, label: string, hint: string) => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <input
        className={FORM_CONTROL}
        value={Array.isArray(c[key]) ? (c[key] as string[]).join(", ") : ""}
        onChange={(e) =>
          onChange({
            [key]: e.target.value
              .split(/[,\n]+/)
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder={hint}
      />
    </label>
  );

  switch (section.type) {
    case "navbar":
      return (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {text("storeName", "Store name in navbar")}
          {text("storeTitle", "Store title (browser tab title)")}
          <div className="space-y-2 md:col-span-2">
            {text("favicon", "Favicon URL / URI")}
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
                  navbarFaviconUploading ? "cursor-not-allowed opacity-70" : ""
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={navbarFaviconUploading}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void uploadNavbarFavicon(file);
                    event.currentTarget.value = "";
                  }}
                />
                {navbarFaviconUploading ? "Uploading..." : "Upload favicon"}
              </label>
              {String(c.favicon ?? "").trim() ? (
                <a href={String(c.favicon)} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">
                  Open favicon
                </a>
              ) : null}
            </div>
            {navbarFaviconUploadError ? <p className="text-xs font-medium text-red-600">{navbarFaviconUploadError}</p> : null}
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">Navbar background color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                value={colorPickerValue(c.navbarBg)}
                onChange={(e) => onChange({ navbarBg: e.target.value })}
              />
              <input
                className={FORM_CONTROL}
                value={String(c.navbarBg ?? "")}
                onChange={(e) => onChange({ navbarBg: e.target.value })}
                placeholder="#f5c400"
              />
            </div>
          </label>
          <p className="text-xs text-slate-500 md:col-span-2">
            Saves to live header branding, browser title, favicon, and navbar background color.
          </p>
        </div>
      );
    case "category_product_row":
      return (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {text("title", "Title")}
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">Category</span>
            <select
              className={cn(FORM_CONTROL, "cursor-pointer")}
              value={String(c.categorySlug ?? "")}
              onChange={(e) => onChange({ categorySlug: e.target.value })}
            >
              <option value="">Select…</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name} ({cat.slug})
                </option>
              ))}
            </select>
          </label>
          {num("productLimit", "Product limit (0 = all)")}
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700">Anchor links (left side)</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-8 text-xs", BTN_OUTLINE_SOLID)}
                onClick={() => patchCategoryAnchorLinks([...displayedCategoryAnchorLinks, { title: "", href: "" }])}
              >
                Add anchor link
              </Button>
            </div>
            <div className="space-y-2">
              {displayedCategoryAnchorLinks.map((anchor, index) => (
                <div key={`anchor-link-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    className={FORM_CONTROL}
                    value={anchor.title}
                    onChange={(event) => {
                      const next = [...displayedCategoryAnchorLinks];
                      next[index] = { ...anchor, title: event.target.value };
                      patchCategoryAnchorLinks(next);
                    }}
                    placeholder="Anchor title"
                  />
                  <input
                    className={FORM_CONTROL}
                    value={anchor.href}
                    onChange={(event) => {
                      const next = [...displayedCategoryAnchorLinks];
                      next[index] = { ...anchor, href: event.target.value };
                      patchCategoryAnchorLinks(next);
                    }}
                    placeholder="/category/your-category"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn("h-10 border-red-200 bg-white text-red-700 hover:bg-red-50 sm:h-auto", BTN_OUTLINE_SOLID)}
                    onClick={() => patchCategoryAnchorLinks(displayedCategoryAnchorLinks.filter((_, i) => i !== index))}
                    disabled={displayedCategoryAnchorLinks.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {text("promoImageUrl", "Right advertising image URL")}
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-slate-100",
                  categoryPromoUploading ? "cursor-not-allowed opacity-70" : ""
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={categoryPromoUploading}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void uploadCategoryPromoImage(file);
                    event.currentTarget.value = "";
                  }}
                />
                {categoryPromoUploading ? "Uploading..." : "Upload image"}
              </label>
              {String(c.promoImageUrl ?? "").trim() ? (
                <a
                  href={String(c.promoImageUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Open uploaded image
                </a>
              ) : null}
            </div>
            {categoryPromoUploadError ? (
              <p className="text-xs font-medium text-red-600">{categoryPromoUploadError}</p>
            ) : null}
          </div>
          {text("promoHref", "Right advertising image link")}
          {text("promoAlt", "Promo alt text")}
        </div>
      );
    case "brand_banner":
      return <BrandBannerMediaForm value={c} onChange={onChange} />;
    case "week_deals":
      return (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {text("title", "Title")}
          {text("subtitle", "Subtitle")}
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">Countdown end date & time</span>
            <input
              type="datetime-local"
              className={FORM_CONTROL}
              value={toDateTimeLocalInputValue(c.endsAt)}
              onChange={(event) => onChange({ endsAt: toIsoFromDateTimeLocalInput(event.target.value) })}
            />
            <p className="text-[11px] text-slate-500">Saved in ISO UTC for the live countdown timer.</p>
          </label>
          <div className="md:col-span-2">
            <WeekDealsProductsForm
              value={c.productIds}
              products={products}
              onChange={(productIds) => onChange({ productIds })}
            />
          </div>
        </div>
      );
    case "top_categories_grid":
      return (
        <div className="mt-3 grid gap-3">
          {text("title", "Section title")}
          <TopCategoriesGridForm
            value={c}
            categories={categories}
            onChange={onChange}
            onSyncCategoryImage={onSyncCategoryImage}
          />
        </div>
      );
    case "brand_logos_strip":
      return (
        <div className="mt-3 grid gap-3">
          <BrandLogosStripForm value={c} onChange={onChange} />
        </div>
      );
    case "featured_tabs":
      return (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-slate-600">
            Select products for Featured, On Sale, and Top Rated using database dropdowns.
          </p>
          <FeaturedTabsProductsForm value={c.tabs} products={products} onChange={(tabs) => onChange({ tabs, tabIds: [] })} />
        </div>
      );
    case "triple_product_lists":
      return (
        <div className="mt-3">
          <TripleProductListsForm
            value={c}
            products={products}
            onChange={onChange}
          />
        </div>
      );
    case "newsletter_signup":
      return (
        <div className="mt-3 grid gap-3">
          {textarea("text", "Copy text")}
          {text("placeholder", "Input placeholder")}
          {text("buttonText", "Button label")}
        </div>
      );
    case "footer":
      return <FooterConfigForm value={c} onChange={onChange} />;
    case "hero_carousel":
      return (
        <div className="mt-3 space-y-4">
          {num("autoplayMs", "Autoplay interval (ms)")}
          <HeroSlidesForm value={c.slides} onChange={(slides) => onChange({ slides })} />
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Right-side product stack</p>
            <PromoCardsForm
              value={c.sideCards}
              products={products}
              sectionLabel="Stacked right cards"
              emptyMessage="Add up to 3 cards and select products from database dropdown."
              onChange={(sideCards) => onChange({ sideCards })}
            />
          </div>
        </div>
      );
    case "promo_tiles":
      return (
        <div className="mt-3">
          <PromoCardsForm value={c.cards} products={products} onChange={(cards) => onChange({ cards })} />
        </div>
      );
    case "announcement_bar":
      return <div className="mt-3">{text("text", "Banner text (updates live top strip on Save)")}</div>;
    default:
      return <p className="mt-3 text-sm text-slate-600">No extra fields for this section type.</p>;
  }
}
