import { connectDB } from "@/lib/db/mongoose";
import { SiteConfig } from "@/lib/db/models/SiteConfig.model";

const DEFAULT_SITE_URL = "https://yadumart.in";
const DEFAULT_SITE_NAME = "YaduInfotech";
const DEFAULT_DESCRIPTION = "Buy ICs, LEDs, Diodes, MOSFETs and electronic components online in India.";
const DEFAULT_OG_IMAGE = "/hero-placeholder.svg";
const DEFAULT_FAVICON = "/favicon.ico";

type SiteSeoDoc = {
  branding?: { storeName?: string; logoUrl?: string };
  seo?: {
    siteName?: string;
    logoUrl?: string;
    defaultTitle?: string;
    defaultDescription?: string;
    ogImage?: string;
    favicon?: string;
  };
};

export type SiteSeoSettings = {
  siteUrl: string;
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  logoUrl: string;
  ogImage: string;
  favicon: string;
  defaultOgImage: string;
  googleVerification: string;
};

function trimOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizePath(path: string): string {
  const normalized = trimOrEmpty(path);
  if (!normalized) return "/";
  if (isAbsoluteUrl(normalized)) return normalized;
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function getSiteUrl(): string {
  const configured = trimTrailingSlash(trimOrEmpty(process.env.NEXT_PUBLIC_SITE_URL));
  return configured || DEFAULT_SITE_URL;
}

export function getMetadataBase(): URL {
  return new URL(getSiteUrl());
}

export function buildCanonical(path: string): string {
  const normalizedPath = normalizePath(path);
  if (isAbsoluteUrl(normalizedPath)) return normalizedPath;
  return `${getSiteUrl()}${normalizedPath}`;
}

export function buildOgImage(imageUrl?: string | null): string {
  const fallback = trimOrEmpty(process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE) || DEFAULT_OG_IMAGE;
  const selected = trimOrEmpty(imageUrl) || fallback;
  return buildCanonical(selected);
}

export function buildTitle(title?: string | null, siteName?: string): string {
  const resolvedSiteName = trimOrEmpty(siteName) || trimOrEmpty(process.env.NEXT_PUBLIC_SITE_NAME) || DEFAULT_SITE_NAME;
  const cleanTitle = trimOrEmpty(title);
  if (!cleanTitle) return resolvedSiteName;
  const suffix = `| ${resolvedSiteName}`.toLowerCase();
  if (cleanTitle.toLowerCase().endsWith(suffix)) return cleanTitle;
  return `${cleanTitle} | ${resolvedSiteName}`;
}

export async function getSiteSeoSettings(): Promise<SiteSeoSettings> {
  const siteUrl = getSiteUrl();
  const envSiteName = trimOrEmpty(process.env.NEXT_PUBLIC_SITE_NAME) || DEFAULT_SITE_NAME;
  const envDefaultOgImage = trimOrEmpty(process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE) || DEFAULT_OG_IMAGE;
  const googleVerification = trimOrEmpty(process.env.GOOGLE_SITE_VERIFY);

  try {
    await connectDB();
    const config = await SiteConfig.findOne({ key: "main" })
      .select("branding.storeName branding.logoUrl seo.siteName seo.logoUrl seo.defaultTitle seo.defaultDescription seo.ogImage seo.favicon")
      .lean<SiteSeoDoc | null>();

    const siteName = trimOrEmpty(config?.seo?.siteName) || trimOrEmpty(config?.branding?.storeName) || envSiteName;
    const logoUrl = trimOrEmpty(config?.seo?.logoUrl) || trimOrEmpty(config?.branding?.logoUrl);
    const ogImage = trimOrEmpty(config?.seo?.ogImage);
    const favicon = trimOrEmpty(config?.seo?.favicon) || DEFAULT_FAVICON;
    const defaultTitle = trimOrEmpty(config?.seo?.defaultTitle) || siteName;
    const defaultDescription = trimOrEmpty(config?.seo?.defaultDescription) || DEFAULT_DESCRIPTION;

    return {
      siteUrl,
      siteName,
      defaultTitle,
      defaultDescription,
      logoUrl,
      ogImage,
      favicon,
      defaultOgImage: envDefaultOgImage,
      googleVerification,
    };
  } catch {
    return {
      siteUrl,
      siteName: envSiteName,
      defaultTitle: envSiteName,
      defaultDescription: DEFAULT_DESCRIPTION,
      logoUrl: "",
      ogImage: "",
      favicon: DEFAULT_FAVICON,
      defaultOgImage: envDefaultOgImage,
      googleVerification,
    };
  }
}

