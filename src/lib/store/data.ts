import { connectDB } from "@/lib/db/mongoose";
import { SiteConfig } from "@/lib/db/models/SiteConfig.model";
import { Category } from "@/lib/db/models/Category.model";
import { Brand } from "@/lib/db/models/Brand.model";
import { Product } from "@/lib/db/models/Product.model";
import mongoose from "mongoose";
import { siteConfig as mockConfig, categories as mockCategories, brands as mockBrands, products as mockProducts } from "@/lib/store/mock-data";
import type { Product as StoreProduct } from "@/lib/store/types";

function toPlainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapDbProductToStoreProduct(
  product: {
    _id: unknown;
    slug: string;
    name: string;
    partNumber: string;
    images?: unknown[];
    costPrice?: number | null;
    salePrice?: number | null;
    isOnSale?: boolean | null;
    basePrice: number;
    stock?: number | null;
    averageRating?: number | null;
    reviewCount?: number | null;
    description?: string | null;
    specifications?: Array<{ key?: string | null; value?: string | null }>;
    category?: unknown;
    brand?: unknown;
  },
  overrides?: { categorySlug?: string; brandSlug?: string }
): StoreProduct {
  return {
    id: String(product._id),
    slug: product.slug,
    name: product.name,
    partNumber: product.partNumber,
    categorySlug:
      overrides?.categorySlug ??
      (typeof product.category === "object" && (product.category as { slug?: string })?.slug
        ? String((product.category as { slug?: string }).slug)
        : typeof product.category === "string"
          ? String(product.category)
          : ""),
    brandSlug:
      overrides?.brandSlug ??
      (typeof product.brand === "object" && (product.brand as { slug?: string })?.slug
        ? String((product.brand as { slug?: string }).slug)
        : typeof product.brand === "string"
          ? String(product.brand)
          : ""),
    image: Array.isArray(product.images) && typeof product.images[0] === "string" ? String(product.images[0]) : "",
    images: Array.isArray(product.images) ? product.images.filter((img): img is string => typeof img === "string") : [],
    costPrice: typeof product.costPrice === "number" ? product.costPrice : undefined,
    sellingPrice: product.isOnSale && typeof product.salePrice === "number" ? product.salePrice : product.basePrice,
    price: product.isOnSale && typeof product.salePrice === "number" ? product.salePrice : product.basePrice,
    stock: product.stock ?? 0,
    rating: product.averageRating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    description: product.description ?? "",
    specifications: Array.isArray(product.specifications)
      ? product.specifications.map((spec) => ({
          key: spec?.key ?? "",
          value: spec?.value ?? "",
        }))
      : [],
  };
}

export async function getSiteConfigOrMock() {
  try {
    await connectDB();
    const config = await SiteConfig.findOne({ key: "main" }).lean<DbSiteConfig | null>();
    if (!config) return { source: "mock" as const, config: toSimpleConfigFromMock() };
    return { source: "db" as const, config: toSimpleConfigFromDb(config) };
  } catch {
    return { source: "mock" as const, config: toSimpleConfigFromMock() };
  }
}

export async function getTopCategoriesOrMock() {
  try {
    await connectDB();
    const cats = await Category.find({ isActive: true }).sort({ order: 1 }).limit(20).select("name slug image").lean();
    if (!cats.length) return { source: "mock" as const, categories: mockCategories.map(c => ({ ...c, image: c.image ?? "" })) };
    return {
      source: "db" as const,
      categories: cats.map((c) => ({
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        image: typeof c.image === "string" ? c.image : "",
      })),
    };
  } catch {
    return { source: "mock" as const, categories: mockCategories.map(c => ({ ...c, image: c.image ?? "" })) };
  }
}

export async function getAllActiveCategoriesFromDb() {
  try {
    await connectDB();
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select("name slug image")
      .lean();
    return {
      source: "db" as const,
      categories: categories.map((category) => ({
        id: String(category._id),
        name: category.name,
        slug: category.slug,
        image: typeof category.image === "string" ? category.image : "",
      })),
      dbError: undefined as string | undefined,
    };
  } catch {
    return {
      source: "db" as const,
      categories: [] as Array<{ id: string; name: string; slug: string; image: string }>,
      dbError: "Live category database is unavailable.",
    };
  }
}

export async function getHomeProductsOrMock(limit = 24) {
  try {
    await connectDB();
    const items = await Product.find({ isActive: true })
      .populate("category", "slug")
      .populate("brand", "slug")
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("name slug partNumber images category brand basePrice costPrice salePrice isOnSale stock averageRating reviewCount description specifications")
      .lean();
    if (!items.length) return { source: "mock" as const, products: mockProducts };
    return {
      source: "db" as const,
      products: items.map<StoreProduct>((p) => ({
        id: String(p._id),
        slug: p.slug,
        name: p.name,
        partNumber: p.partNumber,
        categorySlug:
          typeof (p as { category?: unknown }).category === "object" && (p as { category?: { slug?: string } }).category?.slug
            ? String((p as { category?: { slug?: string } }).category?.slug)
            : typeof (p as { category?: unknown }).category === "string"
              ? String((p as { category?: unknown }).category)
              : "",
        brandSlug:
          typeof (p as { brand?: unknown }).brand === "object" && (p as { brand?: { slug?: string } }).brand?.slug
            ? String((p as { brand?: { slug?: string } }).brand?.slug)
            : typeof (p as { brand?: unknown }).brand === "string"
              ? String((p as { brand?: unknown }).brand)
              : "",
        image: Array.isArray((p as { images?: unknown[] }).images) && typeof (p as { images?: unknown[] }).images?.[0] === "string" ? String((p as { images?: unknown[] }).images?.[0]) : "",
        images: Array.isArray((p as { images?: unknown[] }).images) ? (p as { images?: unknown[] }).images?.filter((img): img is string => typeof img === "string") ?? [] : [],
        costPrice: typeof p.costPrice === "number" ? p.costPrice : undefined,
        sellingPrice: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
        price: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
        stock: p.stock ?? 0,
        rating: p.averageRating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        description: p.description ?? "",
        specifications: Array.isArray(p.specifications)
          ? p.specifications
              .map((s) => ({
                key: (s as unknown as { key?: string | null }).key ?? "",
                value: (s as unknown as { value?: string | null }).value ?? "",
              }))
          : [],
      })),
    };
  } catch {
    return { source: "mock" as const, products: mockProducts };
  }
}

export async function getProductsByIdsOrMock(ids: string[]) {
  const cleanedIds = ids.map((id) => id.trim()).filter(Boolean);
  if (!cleanedIds.length) return { source: "mock" as const, products: [] as StoreProduct[] };

  try {
    await connectDB();
    const validIds = cleanedIds.filter((id) => mongoose.isValidObjectId(id));
    if (!validIds.length) {
      return {
        source: "mock" as const,
        products: cleanedIds.map((id) => mockProducts.find((product) => product.id === id)).filter((product): product is StoreProduct => !!product),
      };
    }

    const items = await Product.find({ _id: { $in: validIds }, isActive: true })
      .populate("category", "slug")
      .populate("brand", "slug")
      .select("name slug partNumber images category brand basePrice costPrice salePrice isOnSale stock averageRating reviewCount description specifications")
      .lean();
    const byId = new Map(items.map((item) => [String(item._id), mapDbProductToStoreProduct(item)]));
    const ordered = validIds.map((id) => byId.get(id)).filter((product): product is StoreProduct => !!product);
    if (ordered.length) return { source: "db" as const, products: ordered };
  } catch {
    // Fall through to mock data.
  }

  return {
    source: "mock" as const,
    products: cleanedIds.map((id) => mockProducts.find((product) => product.id === id)).filter((product): product is StoreProduct => !!product),
  };
}

export async function getCategoriesBySlugsOrMock(slugs: string[]) {
  const cleanedSlugs = slugs.map((slug) => slug.trim()).filter(Boolean);
  if (!cleanedSlugs.length) return {
    source: "mock" as const,
    categories: [] as Array<{ id: string; name: string; slug: string; image?: string }>,
  };

  try {
    await connectDB();
    const items = await Category.find({ slug: { $in: cleanedSlugs }, isActive: true }).select("name slug image").lean();
    const bySlug = new Map(items.map((item) => [
      item.slug,
      {
        id: String(item._id),
        name: item.name,
        slug: item.slug,
        image: typeof item.image === "string" ? item.image : "",
      },
    ]));
    const ordered = cleanedSlugs
      .map((slug) => bySlug.get(slug))
      .filter((category): category is { id: string; name: string; slug: string; image: string } => !!category);
    if (ordered.length) return { source: "db" as const, categories: ordered };
  } catch {
    // Fall through to mock data.
  }

  return {
    source: "mock" as const,
    categories: cleanedSlugs
      .map((slug) => mockCategories.find((category) => category.slug === slug))
      .filter((category): category is { id: string; name: string; slug: string; image?: string } => !!category)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image ?? "",
      })),
  };
}

export async function getProductsByCategorySlugOrMock(slug: string, limit = 24) {
  try {
    await connectDB();
    const category = await Category.findOne({ slug, isActive: true }).select("_id").lean();
    if (!category) return { source: "mock" as const, products: mockProducts.filter((p) => p.categorySlug === slug) };
    const query = Product.find({ isActive: true, category: category._id })
      .sort({ createdAt: -1 })
      .select("name slug partNumber images basePrice costPrice salePrice isOnSale stock averageRating reviewCount description specifications");
    if (Number.isFinite(limit) && limit > 0) {
      query.limit(Math.min(500, Math.trunc(limit)));
    }
    const items = await query.lean();
    if (!items.length) return { source: "mock" as const, products: mockProducts.filter((p) => p.categorySlug === slug) };
    return {
      source: "db" as const,
      products: items.map<StoreProduct>((p) => ({
        id: String(p._id),
        slug: p.slug,
        name: p.name,
        partNumber: p.partNumber,
        categorySlug: slug,
        brandSlug: "",
        image: Array.isArray((p as { images?: unknown[] }).images) && typeof (p as { images?: unknown[] }).images?.[0] === "string" ? String((p as { images?: unknown[] }).images?.[0]) : "",
        costPrice: typeof p.costPrice === "number" ? p.costPrice : undefined,
        sellingPrice: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
        price: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
        stock: p.stock ?? 0,
        rating: p.averageRating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        description: p.description ?? "",
        specifications: Array.isArray(p.specifications)
          ? p.specifications.map((s) => ({
              key: (s as unknown as { key?: string | null }).key ?? "",
              value: (s as unknown as { value?: string | null }).value ?? "",
            }))
          : [],
      })),
    };
  } catch {
    return { source: "mock" as const, products: mockProducts.filter((p) => p.categorySlug === slug) };
  }
}

export async function getProductsByBrandSlugOrMock(slug: string, limit = 24) {
  try {
    await connectDB();
    const brand = await Brand.findOne({ slug, isActive: true }).select("_id").lean();
    if (!brand) return { source: "mock" as const, products: mockProducts.filter((p) => p.brandSlug === slug) };
    const items = await Product.find({ isActive: true, brand: brand._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("name slug partNumber images basePrice costPrice salePrice isOnSale stock averageRating reviewCount description specifications")
      .lean();
    if (!items.length) return { source: "mock" as const, products: mockProducts.filter((p) => p.brandSlug === slug) };
    return {
      source: "db" as const,
      products: items.map<StoreProduct>((p) => ({
        id: String(p._id),
        slug: p.slug,
        name: p.name,
        partNumber: p.partNumber,
        categorySlug: "",
        brandSlug: slug,
        image: Array.isArray((p as { images?: unknown[] }).images) && typeof (p as { images?: unknown[] }).images?.[0] === "string" ? String((p as { images?: unknown[] }).images?.[0]) : "",
        costPrice: typeof p.costPrice === "number" ? p.costPrice : undefined,
        sellingPrice: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
        price: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
        stock: p.stock ?? 0,
        rating: p.averageRating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        description: p.description ?? "",
        specifications: Array.isArray(p.specifications)
          ? p.specifications.map((s) => ({
              key: (s as unknown as { key?: string | null }).key ?? "",
              value: (s as unknown as { value?: string | null }).value ?? "",
            }))
          : [],
      })),
    };
  } catch {
    return { source: "mock" as const, products: mockProducts.filter((p) => p.brandSlug === slug) };
  }
}

export async function searchStoreProductsOrMock({
  query = "",
  categorySlug = "all",
  limit = 80,
}: {
  query?: string;
  categorySlug?: string;
  limit?: number;
}): Promise<{ source: "db"; products: StoreProduct[]; dbError?: string }> {
  const normalizedQuery = String(query || "").trim();
  const normalizedCategorySlug = String(categorySlug || "all").trim().toLowerCase();
  const useCategoryFilter = normalizedCategorySlug && normalizedCategorySlug !== "all";
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.trunc(limit))) : 80;

  try {
    await connectDB();

    const filter: Record<string, unknown> = { isActive: true };

    if (useCategoryFilter) {
      const category = await Category.findOne({ slug: normalizedCategorySlug, isActive: true }).select("_id").lean();
      if (!category) return { source: "db" as const, products: [] as StoreProduct[] };
      filter.category = category._id;
    }

    if (normalizedQuery) {
      const regex = new RegExp(escapeRegex(normalizedQuery), "i");
      filter.$or = [
        { name: regex },
        { partNumber: regex },
        { slug: regex },
        { description: regex },
        { tags: regex },
      ];
    }

    const items = await Product.find(filter)
      .populate("category", "slug")
      .populate("brand", "slug name")
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .select("name slug partNumber images category brand basePrice costPrice salePrice isOnSale stock averageRating reviewCount description specifications")
      .lean();

    if (items.length) {
      const mapped = items.map<StoreProduct>((item) => {
        const categorySlugValue =
          typeof (item as { category?: unknown }).category === "object" &&
          (item as { category?: { slug?: string } }).category?.slug
            ? String((item as { category?: { slug?: string } }).category?.slug)
            : "";
        const brandSlugValue =
          typeof (item as { brand?: unknown }).brand === "object" &&
          (item as { brand?: { slug?: string } }).brand?.slug
            ? String((item as { brand?: { slug?: string } }).brand?.slug)
            : "";
        const brandNameValue =
          typeof (item as { brand?: unknown }).brand === "object" &&
          (item as { brand?: { name?: string } }).brand?.name
            ? String((item as { brand?: { name?: string } }).brand?.name)
            : "";
        return {
          ...mapDbProductToStoreProduct(item, { categorySlug: categorySlugValue, brandSlug: brandSlugValue }),
          brandName: brandNameValue,
        };
      });
      return { source: "db" as const, products: mapped };
    }
    return { source: "db" as const, products: [] as StoreProduct[] };
  } catch {
    return {
      source: "db" as const,
      products: [] as StoreProduct[],
      dbError: "Live product database is unavailable.",
    };
  }
}

export const searchStoreProductsFromDb = searchStoreProductsOrMock;

export async function getBrandBySlugOrMock(slug: string) {
  try {
    await connectDB();
    const brand = await Brand.findOne({ slug, isActive: true }).select("name slug").lean();
    if (!brand) return { source: "mock" as const, brand: mockBrands.find((b) => b.slug === slug) ?? null };
    return { source: "db" as const, brand: { id: String(brand._id), name: brand.name, slug: brand.slug } };
  } catch {
    return { source: "mock" as const, brand: mockBrands.find((b) => b.slug === slug) ?? null };
  }
}

export async function getCategoryBySlugOrMock(slug: string) {
  try {
    await connectDB();
    const category = await Category.findOne({ slug, isActive: true }).select("name slug").lean();
    if (!category) return { source: "mock" as const, category: mockCategories.find((c) => c.slug === slug) ?? null };
    return { source: "db" as const, category: { id: String(category._id), name: category.name, slug: category.slug } };
  } catch {
    return { source: "mock" as const, category: mockCategories.find((c) => c.slug === slug) ?? null };
  }
}

type DbSiteConfig = {
  announcement?: { isEnabled?: boolean; messages?: Array<{ text?: string }> };
  footer?: {
    contactPhone?: string[];
    contactAddress?: string;
    columns?: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
    socialLinks?: Array<{ platform?: string; url?: string; logoUrl?: string }>;
    newsletterText?: string;
    newsletterPlaceholder?: string;
    newsletterButtonText?: string;
  };
  navigation?: {
    topCategories?: string[];
    allCategoryLabel?: string;
    allCategoriesMenu?: { viewAllBrandsLabel?: string; viewAllCategoriesLabel?: string };
    searchPlaceholder?: string;
    searchCategoryLabel?: string;
    superDealsLabel?: string;
    customerCareLabel?: string;
    topNavCategoryLimit?: number;
  };
  branding?: {
    storeName?: string;
    logoUrl?: string;
  };
  seo?: {
    siteName?: string;
    logoUrl?: string;
  };
  appearance?: {
    pageBg?: string;
    announcementBg?: string;
    announcementText?: string;
    announcementFontSize?: number;
    announcementFontWeight?: string;
    announcementFontStyle?: string;
    announcementTextTransform?: string;
    announcementAnimation?: string;
    navbarBg?: string;
    navbarText?: string;
    navbarIconColor?: string;
    productActionButtonBg?: string;
    productActionButtonHoverBg?: string;
    contentPaddingMobile?: number;
    contentPaddingDesktop?: number;
  };
  topBarLinks?: {
    myAccountLabel?: string;
    registerLabel?: string;
    loginLabel?: string;
    showAuthLinks?: boolean;
  };
  navActions?: {
    showCompare?: boolean;
    showWishlist?: boolean;
    showCart?: boolean;
    cartLabel?: string;
  };
  homepage?: {
    sections?: Array<{
      id?: string;
      type?: string;
      order?: number;
      enabled?: boolean;
      config?: Record<string, unknown>;
    }>;
    hero?: {
      eyebrow?: string;
      title?: string;
      description?: string;
      primaryCtaLabel?: string;
      primaryCtaHref?: string;
      secondaryCtaLabel?: string;
      secondaryCtaHref?: string;
    };
    brandStrip?: string[];
    productSectionTitles?: string[];
    categorySections?: Array<{
      categorySlug?: string;
      title?: string;
      isEnabled?: boolean;
      order?: number;
      productLimit?: number;
      anchorTitle?: string;
      anchorHref?: string;
      promoImageUrl?: string;
      promoHref?: string;
      promoAlt?: string;
    }>;
    heroCarousel?: {
      autoplayMs?: number;
      slides?: Array<{
        title?: string;
        subtitle?: string;
        ctaLabel?: string;
        ctaHref?: string;
        imageUrl?: string;
      }>;
      sideCards?: Array<{
        title?: string;
        subtitle?: string;
        ctaLabel?: string;
        ctaHref?: string;
        imageUrl?: string;
      }>;
    };
    featuredTabs?: Array<{
      id?: string;
      title?: string;
      productIds?: string[];
    }>;
    weekDeals?: {
      title?: string;
      subtitle?: string;
      endsAt?: string;
      productIds?: string[];
    };
    topCategories?: {
      title?: string;
      categorySlugs?: string[];
    };
  };
  account?: {
    sidebar?: {
      dashboardLabel?: string;
      ordersLabel?: string;
      wishlistLabel?: string;
      conversationsLabel?: string;
      supportLabel?: string;
      profileLabel?: string;
      signOutLabel?: string;
    };
    dashboard?: {
      totalExpenditureLabel?: string;
      viewOrderHistoryLabel?: string;
      wishlistHeading?: string;
      wishlistEmptyText?: string;
      productsInCartLabel?: string;
      productsInWishlistLabel?: string;
      totalProductsOrderedLabel?: string;
      defaultShippingAddressLabel?: string;
      addNewAddressLabel?: string;
    };
    orders?: {
      heading?: string;
      emptyText?: string;
      orderIdLabel?: string;
      dateLabel?: string;
      amountLabel?: string;
      deliveryStatusLabel?: string;
      paymentStatusLabel?: string;
      optionsLabel?: string;
    };
    wishlist?: { heading?: string; emptyText?: string };
    conversations?: { heading?: string; subtext?: string; emptyText?: string };
    support?: {
      heading?: string;
      createButtonLabel?: string;
      emptyText?: string;
      ticketIdLabel?: string;
      sendingDateLabel?: string;
      subjectLabel?: string;
      statusLabel?: string;
      optionsLabel?: string;
    };
    profile?: {
      heading?: string;
      basicInfoHeading?: string;
      yourNameLabel?: string;
      yourNamePlaceholder?: string;
      yourPhoneLabel?: string;
      yourPhonePlaceholder?: string;
      photoLabel?: string;
      salesCodeLabel?: string;
      salesCodePlaceholder?: string;
      yourPasswordLabel?: string;
      yourPasswordPlaceholder?: string;
      confirmPasswordLabel?: string;
      confirmPasswordPlaceholder?: string;
      updateProfileButtonLabel?: string;
      addressHeading?: string;
      changeEmailHeading?: string;
      yourEmailLabel?: string;
      verifyButtonLabel?: string;
      updateEmailButtonLabel?: string;
    };
  };
};

function toSimpleConfigFromDb(config: DbSiteConfig) {
  const announcementText = config.announcement?.messages?.[0]?.text || "";
  const sectionTitles = config.homepage?.productSectionTitles?.length
    ? config.homepage.productSectionTitles
    : ["Featured Products", "Onsale Products", "Top Rated Products"];
  const homepageSections = Array.isArray(config.homepage?.sections)
    ? config.homepage.sections
        .map((section, index) => {
          const rawType = typeof section.type === "string" ? section.type.trim() : "";
          if (!rawType) return null;

          const rawId = typeof section.id === "string" ? section.id.trim() : "";
          const rawConfig = section.config;
          const plainConfig = toPlainRecord(rawConfig);
          return {
            id: rawId || `section-${index + 1}`,
            type: rawType,
            order: Number.isFinite(section.order) ? Number(section.order) : (index + 1) * 10,
            enabled: section.enabled !== false,
            config: plainConfig,
          };
        })
        .filter((section): section is {
          id: string;
          type: string;
          order: number;
          enabled: boolean;
          config: Record<string, unknown>;
        } => !!section)
    : [];

  return {
    announcement: { isEnabled: !!config.announcement?.isEnabled, text: announcementText },
    nav: { supportPhone: config.footer?.contactPhone?.[0] || "+91 77100 12135", topCategories: config.navigation?.topCategories ?? [] },
    navigation: {
      allCategoryLabel: config.navigation?.allCategoryLabel ?? "All Category",
      allCategoriesMenu: {
        viewAllBrandsLabel: config.navigation?.allCategoriesMenu?.viewAllBrandsLabel ?? "View All Brands",
        viewAllCategoriesLabel: config.navigation?.allCategoriesMenu?.viewAllCategoriesLabel ?? "View All Categories",
      },
      searchPlaceholder: config.navigation?.searchPlaceholder ?? "Search for products",
      searchCategoryLabel: config.navigation?.searchCategoryLabel ?? "All Categories",
      superDealsLabel: config.navigation?.superDealsLabel ?? "Super Deals",
      customerCareLabel: config.navigation?.customerCareLabel ?? "Customer Care",
      topNavCategoryLimit: Math.max(0, Math.min(20, config.navigation?.topNavCategoryLimit ?? 6)),
    },
    branding: {
      storeName: config.branding?.storeName ?? config.seo?.siteName ?? "lumenskart",
      logoUrl: config.branding?.logoUrl ?? config.seo?.logoUrl ?? "",
    },
    sections: [
      { id: "featured", type: "featured", title: sectionTitles[0] ?? "Featured Products" },
      { id: "onsale", type: "onsale", title: sectionTitles[1] ?? "Onsale Products" },
      { id: "topRated", type: "topRated", title: sectionTitles[2] ?? "Top Rated Products" },
    ],
    footer: {
      columns: Array.isArray(config.footer?.columns)
        ? config.footer!.columns!
            .map((column) => ({
              title: String(column?.title ?? "").trim(),
              links: Array.isArray(column?.links)
                ? column.links
                    .map((link) => ({
                      label: String(link?.label ?? "").trim(),
                      href: String(link?.href ?? "").trim(),
                    }))
                    .filter((link) => link.label && link.href)
                : [],
            }))
            .filter((column) => column.title || column.links.length)
        : [],
      phones: config.footer?.contactPhone ?? [],
      address: config.footer?.contactAddress ?? "",
      socialLinks: Array.isArray(config.footer?.socialLinks)
        ? config.footer!.socialLinks!
            .map((item) => ({
              platform: String(item?.platform ?? "").trim(),
              url: String(item?.url ?? "").trim(),
              logoUrl: String(item?.logoUrl ?? "").trim(),
            }))
            .filter((item) => item.platform || item.logoUrl)
        : [],
      newsletterText: config.footer?.newsletterText ?? "Sign up to Newsletter and receive Rs 200 coupon for first shopping.",
      newsletterPlaceholder: config.footer?.newsletterPlaceholder ?? "Email address",
      newsletterButtonText: config.footer?.newsletterButtonText ?? "Sign Up",
    },
    appearance: {
      pageBg: config.appearance?.pageBg ?? "#f7f7f7",
      announcementBg: config.appearance?.announcementBg ?? "#ffffff",
      announcementText: config.appearance?.announcementText ?? "#5f6368",
      announcementFontSize: config.appearance?.announcementFontSize ?? 11,
      announcementFontWeight: config.appearance?.announcementFontWeight ?? "500",
      announcementFontStyle: config.appearance?.announcementFontStyle ?? "normal",
      announcementTextTransform: config.appearance?.announcementTextTransform ?? "none",
      announcementAnimation: config.appearance?.announcementAnimation ?? "marquee",
      navbarBg: config.appearance?.navbarBg ?? "#f5c400",
      navbarText: config.appearance?.navbarText ?? "#1f2937",
      navbarIconColor: config.appearance?.navbarIconColor ?? "#1f2937",
      productActionButtonBg: config.appearance?.productActionButtonBg ?? "#f5c400",
      productActionButtonHoverBg: config.appearance?.productActionButtonHoverBg ?? "#ffd84d",
      contentPaddingMobile: config.appearance?.contentPaddingMobile ?? 24,
      contentPaddingDesktop: config.appearance?.contentPaddingDesktop ?? 40,
    },
    topBarLinks: {
      myAccountLabel: config.topBarLinks?.myAccountLabel ?? "My Account",
      registerLabel: config.topBarLinks?.registerLabel ?? "Register",
      loginLabel: config.topBarLinks?.loginLabel ?? "Login",
      showAuthLinks: config.topBarLinks?.showAuthLinks ?? true,
    },
    navActions: {
      showCompare: config.navActions?.showCompare ?? true,
      showWishlist: config.navActions?.showWishlist ?? true,
      showCart: config.navActions?.showCart ?? true,
      cartLabel: config.navActions?.cartLabel ?? "₹0",
    },
    homepage: {
      sections: homepageSections,
      hero: {
        eyebrow: config.homepage?.hero?.eyebrow ?? "Lumenskart Electronics",
        title: config.homepage?.hero?.title ?? "B2B + B2C Components Marketplace",
        description:
          config.homepage?.hero?.description ??
          "LEDs, resistors, capacitors, ICs, MOSFETs and connectors with quantity pricing and business checkout workflows.",
        primaryCtaLabel: config.homepage?.hero?.primaryCtaLabel ?? "Browse LEDs",
        primaryCtaHref: config.homepage?.hero?.primaryCtaHref ?? "/category/led",
        secondaryCtaLabel: config.homepage?.hero?.secondaryCtaLabel ?? "Shop by Brand",
        secondaryCtaHref: config.homepage?.hero?.secondaryCtaHref ?? "/brands/everstar",
      },
      brandStrip: config.homepage?.brandStrip?.length
        ? config.homepage.brandStrip
        : ["E-tron", "Viking", "Luminus", "Everstar", "IKO Power", "BPS"],
      productSectionTitles: sectionTitles,
      categorySections: (config.homepage?.categorySections ?? []).map((section) => ({
        categorySlug: section.categorySlug ?? "",
        title: section.title ?? "",
        isEnabled: section.isEnabled ?? true,
        order: section.order ?? 0,
        productLimit: section.productLimit ?? 6,
        anchorTitle: section.anchorTitle ?? "",
        anchorHref: section.anchorHref ?? "",
        promoImageUrl: section.promoImageUrl ?? "",
        promoHref: section.promoHref ?? "",
        promoAlt: section.promoAlt ?? "",
      })),
      heroCarousel: {
        autoplayMs: config.homepage?.heroCarousel?.autoplayMs ?? 4200,
        slides:
          config.homepage?.heroCarousel?.slides?.length
            ? config.homepage.heroCarousel.slides.map((slide) => ({
                title: slide.title ?? "",
                subtitle: slide.subtitle ?? "",
                ctaLabel: slide.ctaLabel ?? "",
                ctaHref: slide.ctaHref ?? "",
                imageUrl: slide.imageUrl ?? "",
              }))
            : [],
        sideCards:
          config.homepage?.heroCarousel?.sideCards?.length
            ? config.homepage.heroCarousel.sideCards.map((card) => ({
                title: card.title ?? "",
                subtitle: card.subtitle ?? "",
                ctaLabel: card.ctaLabel ?? "",
                ctaHref: card.ctaHref ?? "",
                imageUrl: card.imageUrl ?? "",
              }))
            : [],
      },
      featuredTabs:
        config.homepage?.featuredTabs?.length
          ? config.homepage.featuredTabs.map((tab, index) => ({
              id: tab.id?.trim() || `tab-${index + 1}`,
              title: tab.title?.trim() || `Tab ${index + 1}`,
              productIds: Array.isArray(tab.productIds) ? tab.productIds.filter(Boolean) : [],
            }))
          : [
              { id: "featured", title: "Featured", productIds: [] },
              { id: "onsale", title: "On Sale", productIds: [] },
              { id: "top-rated", title: "Top Rated", productIds: [] },
            ],
      weekDeals: {
        title: config.homepage?.weekDeals?.title ?? "Week Deals limited, Just now",
        subtitle: config.homepage?.weekDeals?.subtitle ?? "Hurry Up! Offer ends in:",
        endsAt: config.homepage?.weekDeals?.endsAt ?? "",
        productIds: Array.isArray(config.homepage?.weekDeals?.productIds)
          ? config.homepage?.weekDeals?.productIds.filter(Boolean)
          : [],
      },
      topCategories: {
        title: config.homepage?.topCategories?.title ?? "Top Categories this Week",
        categorySlugs: Array.isArray(config.homepage?.topCategories?.categorySlugs)
          ? config.homepage?.topCategories?.categorySlugs.filter(Boolean)
          : [],
      },
    },
    account: {
      sidebar: {
        dashboardLabel: config.account?.sidebar?.dashboardLabel ?? "Dashboard",
        ordersLabel: config.account?.sidebar?.ordersLabel ?? "Order History",
        wishlistLabel: config.account?.sidebar?.wishlistLabel ?? "Wishlist",
        conversationsLabel: config.account?.sidebar?.conversationsLabel ?? "Conversations",
        supportLabel: config.account?.sidebar?.supportLabel ?? "Support Ticket",
        profileLabel: config.account?.sidebar?.profileLabel ?? "Manage Profile",
        signOutLabel: config.account?.sidebar?.signOutLabel ?? "Sign Out",
      },
      dashboard: {
        totalExpenditureLabel: config.account?.dashboard?.totalExpenditureLabel ?? "Total Expenditure",
        viewOrderHistoryLabel: config.account?.dashboard?.viewOrderHistoryLabel ?? "View Order History",
        wishlistHeading: config.account?.dashboard?.wishlistHeading ?? "My Wishlist",
        wishlistEmptyText: config.account?.dashboard?.wishlistEmptyText ?? "There isn't anything added yet",
        productsInCartLabel: config.account?.dashboard?.productsInCartLabel ?? "Products in Cart",
        productsInWishlistLabel: config.account?.dashboard?.productsInWishlistLabel ?? "Products in Wishlist",
        totalProductsOrderedLabel: config.account?.dashboard?.totalProductsOrderedLabel ?? "Total Products Ordered",
        defaultShippingAddressLabel: config.account?.dashboard?.defaultShippingAddressLabel ?? "Default Shipping Address",
        addNewAddressLabel: config.account?.dashboard?.addNewAddressLabel ?? "Add New Address",
      },
      orders: {
        heading: config.account?.orders?.heading ?? "Order History",
        emptyText: config.account?.orders?.emptyText ?? "No orders yet.",
        orderIdLabel: config.account?.orders?.orderIdLabel ?? "Order Id",
        dateLabel: config.account?.orders?.dateLabel ?? "Date",
        amountLabel: config.account?.orders?.amountLabel ?? "Amount",
        deliveryStatusLabel: config.account?.orders?.deliveryStatusLabel ?? "Delivery Status",
        paymentStatusLabel: config.account?.orders?.paymentStatusLabel ?? "Payment Status",
        optionsLabel: config.account?.orders?.optionsLabel ?? "Options",
      },
      wishlist: {
        heading: config.account?.wishlist?.heading ?? "Wishlist",
        emptyText: config.account?.wishlist?.emptyText ?? "There isn't anything added yet",
      },
      conversations: {
        heading: config.account?.conversations?.heading ?? "Conversations",
        subtext: config.account?.conversations?.subtext ?? "Select a conversation to view all messages.",
        emptyText: config.account?.conversations?.emptyText ?? "There isn't anything added yet",
      },
      support: {
        heading: config.account?.support?.heading ?? "Support Ticket",
        createButtonLabel: config.account?.support?.createButtonLabel ?? "Create a Ticket",
        emptyText: config.account?.support?.emptyText ?? "No support tickets.",
        ticketIdLabel: config.account?.support?.ticketIdLabel ?? "Ticket ID",
        sendingDateLabel: config.account?.support?.sendingDateLabel ?? "Sending Date",
        subjectLabel: config.account?.support?.subjectLabel ?? "Subject",
        statusLabel: config.account?.support?.statusLabel ?? "Status",
        optionsLabel: config.account?.support?.optionsLabel ?? "Options",
      },
      profile: {
        heading: config.account?.profile?.heading ?? "Manage Profile",
        basicInfoHeading: config.account?.profile?.basicInfoHeading ?? "Basic Info",
        yourNameLabel: config.account?.profile?.yourNameLabel ?? "Your name",
        yourNamePlaceholder: config.account?.profile?.yourNamePlaceholder ?? "Your name",
        yourPhoneLabel: config.account?.profile?.yourPhoneLabel ?? "Your Phone",
        yourPhonePlaceholder: config.account?.profile?.yourPhonePlaceholder ?? "Your Phone",
        photoLabel: config.account?.profile?.photoLabel ?? "Photo",
        salesCodeLabel: config.account?.profile?.salesCodeLabel ?? "Sales Code",
        salesCodePlaceholder: config.account?.profile?.salesCodePlaceholder ?? "Sales",
        yourPasswordLabel: config.account?.profile?.yourPasswordLabel ?? "Your Password",
        yourPasswordPlaceholder: config.account?.profile?.yourPasswordPlaceholder ?? "New Password",
        confirmPasswordLabel: config.account?.profile?.confirmPasswordLabel ?? "Confirm Password",
        confirmPasswordPlaceholder: config.account?.profile?.confirmPasswordPlaceholder ?? "Confirm Password",
        updateProfileButtonLabel: config.account?.profile?.updateProfileButtonLabel ?? "Update Profile",
        addressHeading: config.account?.profile?.addressHeading ?? "Address",
        changeEmailHeading: config.account?.profile?.changeEmailHeading ?? "Change your email",
        yourEmailLabel: config.account?.profile?.yourEmailLabel ?? "Your Email",
        verifyButtonLabel: config.account?.profile?.verifyButtonLabel ?? "Verify",
        updateEmailButtonLabel: config.account?.profile?.updateEmailButtonLabel ?? "Update Email",
      },
    },
  };
}

export async function getHomepageCategorySectionsOrMock() {
  try {
    await connectDB();
    const config = await SiteConfig.findOne({ key: "main" }).select("homepage.categorySections").lean<{
      homepage?: {
        categorySections?: Array<{
          categorySlug?: string;
          title?: string;
          isEnabled?: boolean;
          order?: number;
          productLimit?: number;
          anchorTitle?: string;
          anchorHref?: string;
          promoImageUrl?: string;
          promoHref?: string;
          promoAlt?: string;
        }>;
      };
    } | null>();
    const configured = (config?.homepage?.categorySections ?? [])
      .filter((section) => section.categorySlug && section.isEnabled !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const activeCategories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 }).select("_id name slug").lean();

    if (configured.length) {
      const bySlug = new Map(activeCategories.map((category) => [category.slug, category]));
      const configuredSlugs = new Set(configured.map((section) => String(section.categorySlug || "")));
      const configuredSections = await Promise.all(
        configured.map(async (section) => {
          const category = bySlug.get(section.categorySlug ?? "");
          if (!category) return null;
          const limit = Math.max(1, Math.min(24, section.productLimit ?? 6));
          const items = await Product.find({ isActive: true, category: category._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("name slug partNumber images basePrice costPrice salePrice isOnSale stock averageRating reviewCount description specifications")
            .lean();
          if (!items.length) return null;
          return {
            id: category.slug,
            categorySlug: category.slug,
            title: section.title?.trim() || category.name,
            anchorTitle: section.anchorTitle?.trim() || `Browse ${section.title?.trim() || category.name}`,
            anchorHref: section.anchorHref?.trim() || `/category/${category.slug}`,
            promoImageUrl: section.promoImageUrl?.trim() || "",
            promoHref: section.promoHref?.trim() || "",
            promoAlt: section.promoAlt?.trim() || "",
            products: items.map<StoreProduct>((p) => ({
              id: String(p._id),
              slug: p.slug,
              name: p.name,
              partNumber: p.partNumber,
              categorySlug: category.slug,
              brandSlug: "",
              image: Array.isArray((p as { images?: unknown[] }).images) && typeof (p as { images?: unknown[] }).images?.[0] === "string" ? String((p as { images?: unknown[] }).images?.[0]) : "",
              costPrice: typeof p.costPrice === "number" ? p.costPrice : undefined,
              sellingPrice: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
              price: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
              stock: p.stock ?? 0,
              rating: p.averageRating ?? 0,
              reviewCount: p.reviewCount ?? 0,
              description: p.description ?? "",
              specifications: Array.isArray(p.specifications)
                ? p.specifications.map((s) => ({
                    key: (s as unknown as { key?: string | null }).key ?? "",
                    value: (s as unknown as { value?: string | null }).value ?? "",
                  }))
                : [],
            })),
          };
        })
      );
      const autoSections = await Promise.all(
        activeCategories
          .filter((category) => !configuredSlugs.has(category.slug))
          .map(async (category) => {
            const items = await Product.find({ isActive: true, category: category._id })
              .sort({ createdAt: -1 })
              .limit(6)
              .select("name slug partNumber images basePrice costPrice salePrice isOnSale stock averageRating reviewCount description specifications")
              .lean();
            if (!items.length) return null;
            return {
              id: category.slug,
              categorySlug: category.slug,
              title: category.name,
              anchorTitle: `Browse ${category.name}`,
              anchorHref: `/category/${category.slug}`,
              promoImageUrl: "",
              promoHref: "",
              promoAlt: "",
              products: items.map<StoreProduct>((p) => ({
                id: String(p._id),
                slug: p.slug,
                name: p.name,
                partNumber: p.partNumber,
                categorySlug: category.slug,
                brandSlug: "",
                image: Array.isArray((p as { images?: unknown[] }).images) && typeof (p as { images?: unknown[] }).images?.[0] === "string" ? String((p as { images?: unknown[] }).images?.[0]) : "",
                costPrice: typeof p.costPrice === "number" ? p.costPrice : undefined,
                sellingPrice: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
                price: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
                stock: p.stock ?? 0,
                rating: p.averageRating ?? 0,
                reviewCount: p.reviewCount ?? 0,
                description: p.description ?? "",
                specifications: Array.isArray(p.specifications)
                  ? p.specifications.map((s) => ({
                      key: (s as unknown as { key?: string | null }).key ?? "",
                      value: (s as unknown as { value?: string | null }).value ?? "",
                    }))
                  : [],
              })),
            };
          })
      );
      const nonEmpty = [...configuredSections, ...autoSections].filter((section): section is NonNullable<typeof section> => !!section);
      if (nonEmpty.length) return { source: "db" as const, sections: nonEmpty };
    }

    const fallbackSections = await Promise.all(
      activeCategories.map(async (category) => {
        const items = await Product.find({ isActive: true, category: category._id })
          .sort({ createdAt: -1 })
          .limit(6)
          .select("name slug partNumber images basePrice costPrice salePrice isOnSale stock averageRating reviewCount description specifications")
          .lean();
        if (!items.length) return null;
        return {
          id: category.slug,
          categorySlug: category.slug,
          title: category.name,
          anchorTitle: `Browse ${category.name}`,
          anchorHref: `/category/${category.slug}`,
          promoImageUrl: "",
          promoHref: "",
          promoAlt: "",
          products: items.map<StoreProduct>((p) => ({
            id: String(p._id),
            slug: p.slug,
            name: p.name,
            partNumber: p.partNumber,
            categorySlug: category.slug,
            brandSlug: "",
            image: Array.isArray((p as { images?: unknown[] }).images) && typeof (p as { images?: unknown[] }).images?.[0] === "string" ? String((p as { images?: unknown[] }).images?.[0]) : "",
            costPrice: typeof p.costPrice === "number" ? p.costPrice : undefined,
            sellingPrice: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
            price: p.isOnSale && typeof p.salePrice === "number" ? p.salePrice : p.basePrice,
            stock: p.stock ?? 0,
            rating: p.averageRating ?? 0,
            reviewCount: p.reviewCount ?? 0,
            description: p.description ?? "",
            specifications: Array.isArray(p.specifications)
              ? p.specifications.map((s) => ({
                  key: (s as unknown as { key?: string | null }).key ?? "",
                  value: (s as unknown as { value?: string | null }).value ?? "",
                }))
              : [],
          })),
        };
      })
    );
    const nonEmpty = fallbackSections.filter((section): section is NonNullable<typeof section> => !!section);
    if (nonEmpty.length) return { source: "db" as const, sections: nonEmpty };
    return { source: "mock" as const, sections: [] };
  } catch {
    const configured = (mockConfig.homepage.categorySections ?? []).filter((section) => section.isEnabled);
    const sections = configured
      .map((section) => ({
        id: section.categorySlug,
        categorySlug: section.categorySlug,
        title: section.title || section.categorySlug,
        anchorTitle: `Browse ${section.title || section.categorySlug}`,
        anchorHref: `/category/${section.categorySlug}`,
        promoImageUrl: section.promoImageUrl || "",
        promoHref: section.promoHref || "",
        promoAlt: section.promoAlt || "",
        products: mockProducts.filter((product) => product.categorySlug === section.categorySlug).slice(0, section.productLimit || 6),
      }))
      .filter((section) => section.products.length > 0);
    return { source: "mock" as const, sections };
  }
}

export async function getProductBySlugOrMock(slug: string) {
  try {
    await connectDB();
    const item = await Product.findOne({ slug, isActive: true })
      .populate("brand", "name slug logo")
      .populate("category", "slug")
      .select(
        "name slug partNumber images brand category basePrice costPrice salePrice isOnSale stock averageRating reviewCount description richDescription specifications technicalDocuments"
      )
      .lean();
    if (!item) {
      const mock = mockProducts.find((product) => product.slug === slug);
      return { source: "mock" as const, product: mock ?? null };
    }
    return {
      source: "db" as const,
      product: {
        id: String(item._id),
        slug: item.slug,
        name: item.name,
        partNumber: item.partNumber,
        categorySlug:
          typeof (item as { category?: unknown }).category === "object" && (item as { category?: { slug?: string } }).category?.slug
            ? String((item as { category?: { slug?: string } }).category?.slug)
            : "",
        brandSlug:
          typeof (item as { brand?: unknown }).brand === "object" && (item as { brand?: { slug?: string } }).brand?.slug
            ? String((item as { brand?: { slug?: string } }).brand?.slug)
            : "",
        brandName:
          typeof (item as { brand?: unknown }).brand === "object" && (item as { brand?: { name?: string } }).brand?.name
            ? String((item as { brand?: { name?: string } }).brand?.name)
            : "",
        brandLogo:
          typeof (item as { brand?: unknown }).brand === "object" && (item as { brand?: { logo?: string } }).brand?.logo
            ? String((item as { brand?: { logo?: string } }).brand?.logo)
            : "",
        image: Array.isArray((item as { images?: unknown[] }).images) && typeof (item as { images?: unknown[] }).images?.[0] === "string" ? String((item as { images?: unknown[] }).images?.[0]) : "",
        images: Array.isArray((item as { images?: unknown[] }).images) ? (item as { images?: unknown[] }).images?.filter((img): img is string => typeof img === "string") ?? [] : [],
        costPrice: typeof item.costPrice === "number" ? item.costPrice : undefined,
        sellingPrice: item.isOnSale && typeof item.salePrice === "number" ? item.salePrice : item.basePrice,
        price: item.isOnSale && typeof item.salePrice === "number" ? item.salePrice : item.basePrice,
        stock: item.stock ?? 0,
        rating: item.averageRating ?? 0,
        reviewCount: item.reviewCount ?? 0,
        description: item.description ?? "",
        richDescription: item.richDescription ?? "",
        specifications: Array.isArray(item.specifications)
          ? item.specifications.map((s) => ({
              key: (s as unknown as { key?: string | null }).key ?? "",
              value: (s as unknown as { value?: string | null }).value ?? "",
            }))
          : [],
        technicalDocuments: Array.isArray(item.technicalDocuments)
          ? item.technicalDocuments
              .map((doc) => ({
                name: (doc as unknown as { name?: string | null }).name ?? "",
                url: (doc as unknown as { url?: string | null }).url ?? "",
              }))
              .filter((doc) => doc.name && doc.url)
          : [],
      } as StoreProduct,
    };
  } catch {
    const mock = mockProducts.find((product) => product.slug === slug);
    return { source: "mock" as const, product: mock ?? null };
  }
}

function toSimpleConfigFromMock() {
  return mockConfig;
}
