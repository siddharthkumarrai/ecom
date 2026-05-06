import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/lib/db/models/Product.model";
import { Brand } from "@/lib/db/models/Brand.model";
import { products as mockProducts, brands as mockBrands } from "@/lib/store/mock-data";
import { buildCanonical } from "@/lib/seo";

export const revalidate = 3600;

const STATIC_ROUTES = ["/", "/category/ic", "/category/led", "/category/diode", "/category/mosfet", "/brands", "/about", "/contact"] as const;

function toDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  return new Date();
}

function dedupeEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: buildCanonical(path),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  try {
    await connectDB();
    const [productRows, brandRows] = await Promise.all([
      Product.find({ isActive: true }).select("slug updatedAt").lean(),
      Brand.find({ isActive: true }).select("slug updatedAt").lean(),
    ]);

    const productEntries: MetadataRoute.Sitemap = productRows
      .filter((product) => typeof product.slug === "string" && product.slug.trim())
      .map((product) => ({
        url: buildCanonical(`/products/${product.slug}`),
        lastModified: toDate(product.updatedAt),
        changeFrequency: "daily",
        priority: 1,
      }));

    const brandEntries: MetadataRoute.Sitemap = brandRows
      .filter((brand) => typeof brand.slug === "string" && brand.slug.trim())
      .map((brand) => ({
        url: buildCanonical(`/brands/${brand.slug}`),
        lastModified: toDate(brand.updatedAt),
        changeFrequency: "weekly",
        priority: 0.7,
      }));

    return dedupeEntries([...staticEntries, ...brandEntries, ...productEntries]);
  } catch {
    const productEntries: MetadataRoute.Sitemap = mockProducts.map((product) => ({
      url: buildCanonical(`/products/${product.slug}`),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    }));
    const brandEntries: MetadataRoute.Sitemap = mockBrands.map((brand) => ({
      url: buildCanonical(`/brands/${brand.slug}`),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    return dedupeEntries([...staticEntries, ...brandEntries, ...productEntries]);
  }
}

