import { getHomepageCategorySectionsOrMock, getSiteConfigOrMock } from "@/lib/store/data";
import type { SiteConfig } from "@/lib/store/types";
import type { HomepageSection } from "@/lib/storefront/types";

type AutoCategorySection = {
  categorySlug: string;
  title: string;
  anchorTitle?: string;
  anchorHref?: string;
  promoImageUrl?: string;
  promoHref?: string;
  promoAlt?: string;
};

function toCategoryRowSection(item: AutoCategorySection, order: number): HomepageSection {
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

/** Default homepage section stack (used when `homepage.sections` is empty, and for admin “reset layout”). */
export function buildDefaultHomepageSections(config: SiteConfig, autoCategorySections: AutoCategorySection[]): HomepageSection[] {
  const categoryRows = autoCategorySections.map((section, index) => toCategoryRowSection(section, 70 + index));

  return [
    {
      id: "announcement-bar",
      type: "announcement_bar",
      order: 1,
      enabled: true,
      config: { text: config.announcement.text },
    },
    {
      id: "navbar",
      type: "navbar",
      order: 2,
      enabled: true,
      config: {
        storeName: config.branding.storeName,
        navbarBg: config.appearance.navbarBg,
      },
    },
    {
      id: "hero-carousel",
      type: "hero_carousel",
      order: 10,
      enabled: true,
      config: {
        autoplayMs: config.homepage.heroCarousel.autoplayMs,
        slides: config.homepage.heroCarousel.slides,
        sideCards: config.homepage.heroCarousel.sideCards,
      },
    },
    {
      id: "featured-tabs",
      type: "featured_tabs",
      order: 30,
      enabled: true,
      config: {
        tabs: (config.homepage.featuredTabs ?? []).map((tab) => ({
          id: String(tab.id || ""),
          title: String(tab.title || ""),
          productIds: Array.isArray(tab.productIds) ? tab.productIds.map((productId) => String(productId)).filter(Boolean) : [],
        })),
      },
    },
    {
      id: "brand-banner-everstar",
      type: "brand_banner",
      order: 40,
      enabled: true,
      config: {
        href: "/brands/everstar",
        desktopImageUrl: "https://lumenskart.in/public/uploads/all/0nykr2ZauQA6nblRp3iOiivYHW1mWsHo6UJVUtVe.webp",
        mobileImageUrl: "https://lumenskart.in/public/uploads/all/0nykr2ZauQA6nblRp3iOiivYHW1mWsHo6UJVUtVe.webp",
      },
    },
    {
      id: "week-deals",
      type: "week_deals",
      order: 50,
      enabled: true,
      config: {
        title: config.homepage.weekDeals.title,
        subtitle: config.homepage.weekDeals.subtitle,
        endsAt: config.homepage.weekDeals.endsAt,
        productIds: Array.isArray(config.homepage.weekDeals.productIds)
          ? config.homepage.weekDeals.productIds.map((productId) => String(productId)).filter(Boolean)
          : [],
      },
    },
    ...categoryRows,
    {
      id: "top-categories-grid",
      type: "top_categories_grid",
      order: 300,
      enabled: true,
      config: {
        title: config.homepage.topCategories.title,
        categorySlugs: config.homepage.topCategories.categorySlugs,
      },
    },
    {
      id: "brand-logos-strip",
      type: "brand_logos_strip",
      order: 310,
      enabled: true,
      config: { brands: config.homepage.brandStrip },
    },
    {
      id: "triple-product-lists",
      type: "triple_product_lists",
      order: 320,
      enabled: true,
      config: {},
    },
    {
      id: "footer",
      type: "footer",
      order: 330,
      enabled: true,
      config: {
        storeName: config.branding.storeName,
        logoUrl: config.branding.logoUrl,
        columns: config.footer.columns,
        phones: config.footer.phones,
        address: config.footer.address,
        socialLinks: config.footer.socialLinks ?? [],
        newsletterText: config.footer.newsletterText,
        newsletterPlaceholder: config.footer.newsletterPlaceholder,
        newsletterButtonText: config.footer.newsletterButtonText,
      },
    },
  ];
}

function removeLegacyDuplicateNewsletterSection(sections: HomepageSection[], config: SiteConfig): HomepageSection[] {
  return sections.filter((section) => {
    if (section.type !== "newsletter_signup" || section.id !== "newsletter-signup") {
      return true;
    }

    const text = String(section.config.text || "");
    const placeholder = String(section.config.placeholder || "");
    const buttonText = String(section.config.buttonText || "");

    const isLegacyDuplicate =
      (text === "" || text === config.footer.newsletterText) &&
      (placeholder === "" || placeholder === config.footer.newsletterPlaceholder) &&
      (buttonText === "" || buttonText === config.footer.newsletterButtonText);

    // Keep custom legacy sections; remove only the old default duplicate near footer.
    return !isLegacyDuplicate;
  });
}

function appendMissingAutoCategoryRows(
  sections: HomepageSection[],
  autoCategorySections: AutoCategorySection[]
): HomepageSection[] {
  const existingCategorySlugs = new Set(
    sections
      .filter((section) => section.type === "category_product_row")
      .map((section) => String(section.config.categorySlug || ""))
      .filter(Boolean)
  );
  const missingAutoCategorySections = autoCategorySections
    .filter((section) => !existingCategorySlugs.has(section.categorySlug));
  if (!missingAutoCategorySections.length) return sections;

  const existingCategoryRowOrders = sections
    .filter((section) => section.type === "category_product_row")
    .map((section) => section.order);
  const weekDealsOrder = sections.find((section) => section.type === "week_deals")?.order ?? 50;
  const insertionAnchorOrder = existingCategoryRowOrders.length
    ? Math.max(...existingCategoryRowOrders)
    : weekDealsOrder;
  const insertionStep = 0.001;

  const autoRowsToAppend = missingAutoCategorySections
    .map((section, index) => toCategoryRowSection(section, insertionAnchorOrder + insertionStep * (index + 1)));
  return [...sections, ...autoRowsToAppend];
}

export async function getHomepageConfig() {
  const [{ config }, categorySectionsResult] = await Promise.all([
    getSiteConfigOrMock(),
    getHomepageCategorySectionsOrMock(),
  ]);
  const typedConfig = config as SiteConfig;
  const homepage = typedConfig.homepage ?? {};
  const autoCategorySections: AutoCategorySection[] = (categorySectionsResult.sections ?? []).map((section) => ({
    categorySlug: String(section.categorySlug || ""),
    title: String(section.title || section.categorySlug || ""),
    anchorTitle: String((section as { anchorTitle?: unknown }).anchorTitle || ""),
    anchorHref: String((section as { anchorHref?: unknown }).anchorHref || ""),
    promoImageUrl: String(section.promoImageUrl || ""),
    promoHref: String(section.promoHref || ""),
    promoAlt: String(section.promoAlt || ""),
  })).filter((section) => section.categorySlug);

  const sectionsFromCms = Array.isArray(homepage.sections)
    ? (homepage.sections as HomepageSection[])
    : [];

  if (sectionsFromCms.length) {
    const persistedSections = removeLegacyDuplicateNewsletterSection([...sectionsFromCms], typedConfig)
      .sort((a, b) => a.order - b.order);
    const sections = appendMissingAutoCategoryRows(persistedSections, autoCategorySections)
      .filter((section) => section.enabled !== false)
      .sort((a, b) => a.order - b.order);
    return {
      config: typedConfig,
      sections,
    };
  }

  const baseSections = buildDefaultHomepageSections(typedConfig, autoCategorySections);
  const sections = appendMissingAutoCategoryRows(baseSections, autoCategorySections)
    .filter((section) => section.enabled !== false)
    .sort((a, b) => a.order - b.order);

  return {
    config: typedConfig,
    sections,
  };
}
