import { revalidatePath } from "next/cache";
import { z } from "zod";
import { error, json } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectDB } from "@/lib/db/mongoose";
import { SiteConfig as SiteConfigModel } from "@/lib/db/models/SiteConfig.model";
import { getHomepageCategorySectionsOrMock, getSiteConfigOrMock } from "@/lib/store/data";
import type { SiteConfig } from "@/lib/store/types";
import { buildDefaultHomepageSections } from "@/lib/storefront/getHomepageConfig";
import type { SectionType } from "@/lib/storefront/types";

const SECTION_TYPES: [SectionType, ...SectionType[]] = [
  "announcement_bar",
  "navbar",
  "hero_carousel",
  "promo_tiles",
  "featured_tabs",
  "week_deals",
  "category_product_row",
  "brand_banner",
  "top_categories_grid",
  "brand_logos_strip",
  "triple_product_lists",
  "newsletter_signup",
  "footer",
];

const SectionSchema = z.object({
  id: z.string().min(1).max(160),
  type: z.enum(SECTION_TYPES),
  order: z.number().int(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

const PutBodySchema = z.object({
  sections: z.array(SectionSchema).max(100),
});

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

type AutoCategorySection = {
  categorySlug: string;
  title: string;
  anchorTitle?: string;
  anchorHref?: string;
  promoImageUrl?: string;
  promoHref?: string;
  promoAlt?: string;
};

type SectionRow = {
  id: string;
  type: SectionType;
  order: number;
  enabled: boolean;
  config: Record<string, unknown>;
};

function isSectionType(value: unknown): value is SectionType {
  return typeof value === "string" && (SECTION_TYPES as readonly string[]).includes(value);
}

function sanitizeFooterColumns(value: unknown): Array<{ title: string; links: Array<{ label: string; href: string }> }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((column) => {
      if (!column || typeof column !== "object" || Array.isArray(column)) return null;
      const typedColumn = column as { title?: unknown; links?: unknown };
      const title = typeof typedColumn.title === "string" ? typedColumn.title.trim() : "";
      const links = Array.isArray(typedColumn.links)
        ? typedColumn.links
            .map((link) => {
              if (!link || typeof link !== "object" || Array.isArray(link)) return null;
              const typedLink = link as { label?: unknown; href?: unknown };
              const label = typeof typedLink.label === "string" ? typedLink.label.trim() : "";
              const href = typeof typedLink.href === "string" ? typedLink.href.trim() : "";
              if (!label || !href) return null;
              return { label, href };
            })
            .filter((link): link is { label: string; href: string } => Boolean(link))
        : [];
      if (!title && !links.length) return null;
      return { title, links };
    })
    .filter((column): column is { title: string; links: Array<{ label: string; href: string }> } => Boolean(column));
}

function sanitizeFooterSocialLinks(value: unknown): Array<{ platform: string; url: string; logoUrl: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const typedItem = item as { platform?: unknown; url?: unknown; logoUrl?: unknown };
      const platform = typeof typedItem.platform === "string" ? typedItem.platform.trim() : "";
      const url = typeof typedItem.url === "string" ? typedItem.url.trim() : "";
      const logoUrl = typeof typedItem.logoUrl === "string" ? typedItem.logoUrl.trim() : "";
      if (!platform && !logoUrl) return null;
      return { platform, url, logoUrl };
    })
    .filter((item): item is { platform: string; url: string; logoUrl: string } => Boolean(item));
}

function toCategoryRowSection(item: AutoCategorySection, order: number): SectionRow {
  const resolvedAnchorTitle = item.anchorTitle || `Browse ${item.title || item.categorySlug}`;
  const resolvedAnchorHref = item.anchorHref || `/category/${item.categorySlug}`;
  return {
    id: `category-row-${item.categorySlug}`,
    type: "category_product_row",
    order,
    enabled: true,
    config: {
      title: item.title || item.categorySlug,
      categorySlug: item.categorySlug,
      productLimit: 0,
      anchorTitle: resolvedAnchorTitle,
      anchorHref: resolvedAnchorHref,
      anchorLinks: [{ title: resolvedAnchorTitle, href: resolvedAnchorHref }],
      promoImageUrl: item.promoImageUrl || "",
      promoHref: item.promoHref || "",
      promoAlt: item.promoAlt || "",
    },
  };
}

function normalizeOrders(list: SectionRow[]): SectionRow[] {
  return list.map((section, index) => ({ ...section, order: (index + 1) * 10 }));
}

function appendMissingAutoCategoryRows(
  sections: SectionRow[],
  autoCategorySections: AutoCategorySection[]
): SectionRow[] {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const existingSlugs = new Set(
    sorted
      .filter((section) => section.type === "category_product_row")
      .map((section) => String(section.config.categorySlug || ""))
      .filter(Boolean)
  );
  const missing = autoCategorySections.filter((section) => !existingSlugs.has(section.categorySlug));
  if (!missing.length) return sorted;

  let lastCategoryIndex = -1;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i]?.type === "category_product_row") {
      lastCategoryIndex = i;
      break;
    }
  }
  const weekDealsIndex = sorted.findIndex((section) => section.type === "week_deals");
  const insertionIndex = lastCategoryIndex >= 0
    ? lastCategoryIndex + 1
    : weekDealsIndex >= 0
      ? weekDealsIndex + 1
      : sorted.length;
  const next = [...sorted];
  next.splice(
    insertionIndex,
    0,
    ...missing.map((section) => toCategoryRowSection(section, 0))
  );
  return normalizeOrders(next);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  await connectDB();
  const doc = await SiteConfigModel.findOne({ key: "main" })
    .select("homepage.sections branding.storeName branding.logoUrl appearance.navbarBg footer.columns footer.contactPhone footer.contactAddress footer.newsletterText footer.newsletterPlaceholder footer.newsletterButtonText footer.socialLinks")
    .lean<{
      homepage?: { sections?: unknown[] };
      branding?: { storeName?: string; logoUrl?: string };
      appearance?: { navbarBg?: string };
      footer?: {
        columns?: Array<{ title?: string; links?: Array<{ label?: string; href?: string }> }>;
        contactPhone?: string[];
        contactAddress?: string;
        newsletterText?: string;
        newsletterPlaceholder?: string;
        newsletterButtonText?: string;
        socialLinks?: Array<{ platform?: string; url?: string; logoUrl?: string }>;
      };
    } | null>();
  const globalStoreName = typeof doc?.branding?.storeName === "string" ? doc.branding.storeName : "";
  const globalLogoUrl = typeof doc?.branding?.logoUrl === "string" ? doc.branding.logoUrl : "";
  const globalNavbarBg = typeof doc?.appearance?.navbarBg === "string" ? doc.appearance.navbarBg : "";
  const globalFooterColumns = sanitizeFooterColumns(doc?.footer?.columns ?? []);
  const globalFooterPhones = Array.isArray(doc?.footer?.contactPhone)
    ? doc.footer.contactPhone.map((phone) => String(phone || "").trim()).filter(Boolean)
    : [];
  const globalFooterAddress = typeof doc?.footer?.contactAddress === "string" ? doc.footer.contactAddress : "";
  const globalNewsletterText = typeof doc?.footer?.newsletterText === "string" ? doc.footer.newsletterText : "";
  const globalNewsletterPlaceholder = typeof doc?.footer?.newsletterPlaceholder === "string" ? doc.footer.newsletterPlaceholder : "";
  const globalNewsletterButtonText = typeof doc?.footer?.newsletterButtonText === "string" ? doc.footer.newsletterButtonText : "";
  const globalFooterSocialLinks = sanitizeFooterSocialLinks(doc?.footer?.socialLinks ?? []);
  const rows: SectionRow[] = Array.isArray(doc?.homepage?.sections)
    ? doc.homepage.sections
      .map((section, index) => {
        const row = (section ?? {}) as {
          id?: unknown;
          type?: unknown;
          order?: unknown;
          enabled?: unknown;
          config?: unknown;
        };
        if (!isSectionType(row.type)) return null;
        const baseConfig = row.config && typeof row.config === "object" && !Array.isArray(row.config)
          ? row.config as Record<string, unknown>
          : {};
        const config = row.type === "navbar"
          ? {
              ...baseConfig,
              storeName: String(baseConfig.storeName ?? globalStoreName ?? ""),
              navbarBg: String(baseConfig.navbarBg ?? globalNavbarBg ?? ""),
            }
          : row.type === "footer"
            ? {
                ...baseConfig,
                storeName: String(baseConfig.storeName ?? globalStoreName ?? ""),
                logoUrl: String(baseConfig.logoUrl ?? globalLogoUrl ?? ""),
                columns: sanitizeFooterColumns(baseConfig.columns ?? globalFooterColumns),
                phones: Array.isArray(baseConfig.phones)
                  ? baseConfig.phones.map((phone) => String(phone || "").trim()).filter(Boolean)
                  : globalFooterPhones,
                address: String(baseConfig.address ?? globalFooterAddress ?? ""),
                newsletterText: String(baseConfig.newsletterText ?? globalNewsletterText ?? ""),
                newsletterPlaceholder: String(baseConfig.newsletterPlaceholder ?? globalNewsletterPlaceholder ?? ""),
                newsletterButtonText: String(baseConfig.newsletterButtonText ?? globalNewsletterButtonText ?? ""),
                socialLinks: sanitizeFooterSocialLinks(baseConfig.socialLinks ?? globalFooterSocialLinks),
              }
          : baseConfig;
        return {
          id: String(row.id ?? `${row.type}-${index + 1}`),
          type: row.type,
          order: Number.isFinite(Number(row.order)) ? Number(row.order) : 0,
          enabled: row.enabled !== false,
          config,
        };
      })
      .filter((row): row is SectionRow => Boolean(row))
    : [];

  const categorySectionsResult = await getHomepageCategorySectionsOrMock();
  const autoCategorySections: AutoCategorySection[] = (categorySectionsResult.sections ?? [])
    .map((section) => ({
      categorySlug: String(section.categorySlug || ""),
      title: String(section.title || section.categorySlug || ""),
      anchorTitle: String((section as { anchorTitle?: unknown }).anchorTitle || ""),
      anchorHref: String((section as { anchorHref?: unknown }).anchorHref || ""),
      promoImageUrl: String(section.promoImageUrl || ""),
      promoHref: String(section.promoHref || ""),
      promoAlt: String(section.promoAlt || ""),
    }))
    .filter((section) => section.categorySlug);

  const mergedSections = rows.length
    ? appendMissingAutoCategoryRows(rows, autoCategorySections)
    : buildDefaultHomepageSections((await getSiteConfigOrMock()).config as SiteConfig, autoCategorySections);
  return json({ sections: mergedSections });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const body = await req.json().catch(() => null);
  const parsed = PutBodySchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  const firstAnnouncementSection = parsed.data.sections.find((section) => section.type === "announcement_bar");
  const firstNavbarSection = parsed.data.sections.find((section) => section.type === "navbar");
  const firstFooterSection = parsed.data.sections.find((section) => section.type === "footer");
  const announcementTextRaw = firstAnnouncementSection?.config?.text;
  const announcementText = typeof announcementTextRaw === "string" ? announcementTextRaw.trim() : "";
  const navbarStoreNameRaw = firstNavbarSection?.config?.storeName;
  const navbarStoreName = typeof navbarStoreNameRaw === "string" ? navbarStoreNameRaw.trim() : "";
  const navbarBgRaw = firstNavbarSection?.config?.navbarBg;
  const navbarBg = typeof navbarBgRaw === "string" ? navbarBgRaw.trim() : "";
  const footerStoreNameRaw = firstFooterSection?.config?.storeName;
  const footerStoreName = typeof footerStoreNameRaw === "string" ? footerStoreNameRaw.trim() : "";
  const footerLogoUrlRaw = firstFooterSection?.config?.logoUrl;
  const footerLogoUrl = typeof footerLogoUrlRaw === "string" ? footerLogoUrlRaw.trim() : "";
  const footerColumns = sanitizeFooterColumns(firstFooterSection?.config?.columns ?? []);
  const footerPhones = Array.isArray(firstFooterSection?.config?.phones)
    ? firstFooterSection.config.phones.map((phone) => String(phone || "").trim()).filter(Boolean)
    : [];
  const footerAddressRaw = firstFooterSection?.config?.address;
  const footerAddress = typeof footerAddressRaw === "string" ? footerAddressRaw.trim() : "";
  const footerNewsletterTextRaw = firstFooterSection?.config?.newsletterText;
  const footerNewsletterText = typeof footerNewsletterTextRaw === "string" ? footerNewsletterTextRaw.trim() : "";
  const footerNewsletterPlaceholderRaw = firstFooterSection?.config?.newsletterPlaceholder;
  const footerNewsletterPlaceholder = typeof footerNewsletterPlaceholderRaw === "string" ? footerNewsletterPlaceholderRaw.trim() : "";
  const footerNewsletterButtonTextRaw = firstFooterSection?.config?.newsletterButtonText;
  const footerNewsletterButtonText = typeof footerNewsletterButtonTextRaw === "string" ? footerNewsletterButtonTextRaw.trim() : "";
  const footerSocialLinks = sanitizeFooterSocialLinks(firstFooterSection?.config?.socialLinks ?? []);

  const setPatch: Record<string, unknown> = {
    "homepage.sections": parsed.data.sections,
  };

  if (firstAnnouncementSection || firstNavbarSection || firstFooterSection) {
    const existingDoc = await SiteConfigModel.findOne({ key: "main" })
        .select("homepage.sections announcement.messages branding.storeName branding.logoUrl appearance.navbarBg footer.columns footer.contactPhone footer.contactAddress footer.newsletterText footer.newsletterPlaceholder footer.newsletterButtonText footer.socialLinks")
        .lean<{
          homepage?: {
            sections?: Array<{
              type?: string;
              enabled?: boolean;
              config?: Record<string, unknown>;
            }>;
          };
          announcement?: {
            messages?: Array<{
              text?: string;
              link?: string;
              bgColor?: string;
              textColor?: string;
            }>;
          };
          branding?: {
            storeName?: string;
            logoUrl?: string;
          };
          appearance?: {
            navbarBg?: string;
          };
          footer?: {
            columns?: Array<{ title?: string; links?: Array<{ label?: string; href?: string }> }>;
            contactPhone?: string[];
            contactAddress?: string;
            newsletterText?: string;
            newsletterPlaceholder?: string;
            newsletterButtonText?: string;
            socialLinks?: Array<{ platform?: string; url?: string; logoUrl?: string }>;
          };
        } | null>();

    if (firstAnnouncementSection) {
      const existingAnnouncementSection = Array.isArray(existingDoc?.homepage?.sections)
        ? existingDoc.homepage.sections.find((section) => section.type === "announcement_bar")
        : undefined;
      const existingSectionEnabled = existingAnnouncementSection?.enabled !== false;
      const existingTextRaw = existingAnnouncementSection?.config?.text;
      const existingSectionText = typeof existingTextRaw === "string" ? existingTextRaw.trim() : "";

      if ((firstAnnouncementSection.enabled !== false) !== existingSectionEnabled) {
        setPatch["announcement.isEnabled"] = firstAnnouncementSection.enabled !== false;
      }

      if (announcementText && announcementText !== existingSectionText) {
        const existingMessages = Array.isArray(existingDoc?.announcement?.messages)
          ? existingDoc.announcement.messages
          : [];

        const nextMessages = existingMessages.length
          ? existingMessages.map((message, index) => (
              index === 0
                ? { ...message, text: announcementText }
                : message
            ))
          : [{ text: announcementText, link: "", bgColor: "#F5C400", textColor: "#000000" }];

        setPatch["announcement.messages"] = nextMessages;
      }
    }

    if (firstNavbarSection) {
      const existingNavbarSection = Array.isArray(existingDoc?.homepage?.sections)
        ? existingDoc.homepage.sections.find((section) => section.type === "navbar")
        : undefined;
      const existingStoreNameRaw = existingNavbarSection?.config?.storeName;
      const existingSectionStoreName = typeof existingStoreNameRaw === "string" ? existingStoreNameRaw.trim() : "";
      const existingGlobalStoreName = typeof existingDoc?.branding?.storeName === "string"
        ? existingDoc.branding.storeName.trim()
        : "";
      const currentStoreName = existingSectionStoreName || existingGlobalStoreName;

      if (navbarStoreName && navbarStoreName !== currentStoreName) {
        setPatch["branding.storeName"] = navbarStoreName;
      }

      const existingNavbarBgRaw = existingNavbarSection?.config?.navbarBg;
      const existingSectionNavbarBg = typeof existingNavbarBgRaw === "string" ? existingNavbarBgRaw.trim() : "";
      const existingGlobalNavbarBg = typeof existingDoc?.appearance?.navbarBg === "string"
        ? existingDoc.appearance.navbarBg.trim()
        : "";
      const currentNavbarBg = (existingSectionNavbarBg || existingGlobalNavbarBg || "").toLowerCase();
      const nextNavbarBg = navbarBg.toLowerCase();

      if (HEX_COLOR_RE.test(navbarBg) && nextNavbarBg !== currentNavbarBg) {
        setPatch["appearance.navbarBg"] = navbarBg;
      }
    }

    if (firstFooterSection) {
      const existingGlobalStoreName = typeof existingDoc?.branding?.storeName === "string"
        ? existingDoc.branding.storeName.trim()
        : "";
      if (footerStoreName && footerStoreName !== existingGlobalStoreName) {
        setPatch["branding.storeName"] = footerStoreName;
      }

      const existingGlobalLogoUrl = typeof existingDoc?.branding?.logoUrl === "string"
        ? existingDoc.branding.logoUrl.trim()
        : "";
      if (footerLogoUrl !== existingGlobalLogoUrl) {
        setPatch["branding.logoUrl"] = footerLogoUrl;
      }

      setPatch["footer.columns"] = footerColumns;
      setPatch["footer.contactPhone"] = footerPhones;
      setPatch["footer.contactAddress"] = footerAddress;
      setPatch["footer.newsletterText"] = footerNewsletterText;
      setPatch["footer.newsletterPlaceholder"] = footerNewsletterPlaceholder;
      setPatch["footer.newsletterButtonText"] = footerNewsletterButtonText;
      setPatch["footer.socialLinks"] = footerSocialLinks;
    }
  }

  await SiteConfigModel.updateOne({ key: "main" }, { $set: setPatch }, { upsert: true });
  revalidatePath("/");
  return json({ ok: true, sections: parsed.data.sections });
}

/** Replace `homepage.sections` with the same auto-generated stack used when sections are empty. */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "unauthorized" ? "Unauthorized" : "Not found", admin.reason === "unauthorized" ? 401 : 404);

  const [{ config }, categorySectionsResult] = await Promise.all([getSiteConfigOrMock(), getHomepageCategorySectionsOrMock()]);
  const typedConfig = config as SiteConfig;
  const autoCategorySections = (categorySectionsResult.sections ?? [])
    .map((section) => ({
      categorySlug: String(section.categorySlug || ""),
      title: String(section.title || section.categorySlug || ""),
      promoImageUrl: String(section.promoImageUrl || ""),
      promoHref: String(section.promoHref || ""),
      promoAlt: String(section.promoAlt || ""),
    }))
    .filter((section) => section.categorySlug);

  const sections = buildDefaultHomepageSections(typedConfig, autoCategorySections);

  await connectDB();
  await SiteConfigModel.updateOne({ key: "main" }, { $set: { "homepage.sections": sections } }, { upsert: true });
  revalidatePath("/");
  return json({ ok: true, sections });
}
