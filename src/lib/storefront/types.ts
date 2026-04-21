import type { Category, Product } from "@/lib/store/types";

export type SectionType =
  | "announcement_bar"
  | "navbar"
  | "hero_carousel"
  | "promo_tiles"
  | "featured_tabs"
  | "week_deals"
  | "category_product_row"
  | "brand_banner"
  | "top_categories_grid"
  | "brand_logos_strip"
  | "triple_product_lists"
  | "newsletter_signup"
  | "footer";

export type BaseSectionConfig<T extends SectionType, C extends Record<string, unknown>> = {
  id: string;
  type: T;
  order: number;
  enabled: boolean;
  config: C;
};

export type AnnouncementBarSectionConfig = BaseSectionConfig<
  "announcement_bar",
  {
    text?: string;
    textColor?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    textTransform?: string;
    animation?: string;
  }
>;
export type NavbarSectionConfig = BaseSectionConfig<
  "navbar",
  {
    storeName?: string;
    storeTitle?: string;
    favicon?: string;
    navbarBg?: string;
  }
>;
export type HeroCarouselSectionConfig = BaseSectionConfig<
  "hero_carousel",
  {
    autoplayMs?: number;
    slides?: Array<Record<string, unknown>>;
    sideCards?: Array<{
      productId?: string;
      title?: string;
      subtitle?: string;
      ctaLabel?: string;
      ctaHref?: string;
      href?: string;
      link?: string;
      imageUrl?: string;
      image?: string;
    }>;
  }
>;
export type PromoTilesSectionConfig = BaseSectionConfig<
  "promo_tiles",
  {
    cards?: Array<{
      productId?: string;
      title?: string;
      subtitle?: string;
      ctaLabel?: string;
      ctaHref?: string;
      imageUrl?: string;
      href?: string;
      link?: string;
      image?: string;
    }>;
  }
>;
export type FeaturedTabsSectionConfig = BaseSectionConfig<
  "featured_tabs",
  {
    tabIds?: string[];
    tabs?: Array<{
      id?: string;
      title?: string;
      productIds?: string[];
    }>;
  }
>;
export type WeekDealsSectionConfig = BaseSectionConfig<
  "week_deals",
  { title?: string; subtitle?: string; endsAt?: string; productIds?: string[] }
>;
export type CategoryProductRowSectionConfig = BaseSectionConfig<
  "category_product_row",
  {
    title?: string;
    categorySlug?: string;
    productLimit?: number;
    anchorTitle?: string;
    anchorHref?: string;
    anchorLinks?: Array<{ title?: string; href?: string }>;
    promoImageUrl?: string;
    promoHref?: string;
    promoAlt?: string;
  }
>;
export type BrandBannerSectionConfig = BaseSectionConfig<
  "brand_banner",
  {
    title?: string;
    subtitle?: string;
    href?: string;
    imageUrl?: string;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
  }
>;
export type TopCategoriesGridSectionConfig = BaseSectionConfig<
  "top_categories_grid",
  { title?: string; categorySlugs?: string[]; categoryImages?: Record<string, string> }
>;
export type BrandLogosStripSectionConfig = BaseSectionConfig<
  "brand_logos_strip",
  {
    brands?: string[];
    brandItems?: Array<{
      label?: string;
      href?: string;
      grayLogoUrl?: string;
      colorLogoUrl?: string;
    }>;
  }
>;
export type TripleProductListsSectionConfig = BaseSectionConfig<
  "triple_product_lists",
  {
    title?: string;
    sideBannerImageUrl?: string;
    sideBannerHref?: string;
    tripleTabs?: Array<{
      id?: string;
      title?: string;
      productIds?: string[];
    }>;
  }
>;
export type NewsletterSignupSectionConfig = BaseSectionConfig<
  "newsletter_signup",
  { text?: string; placeholder?: string; buttonText?: string }
>;
export type FooterSectionConfig = BaseSectionConfig<
  "footer",
  {
    storeName?: string;
    logoUrl?: string;
    phones?: string[];
    address?: string;
    socialLinks?: Array<{ platform?: string; url?: string; logoUrl?: string }>;
    newsletterText?: string;
    newsletterPlaceholder?: string;
    newsletterButtonText?: string;
    columns?: Array<{
      title?: string;
      links?: Array<{ label?: string; href?: string }>;
    }>;
  }
>;

export type HomepageSection =
  | AnnouncementBarSectionConfig
  | NavbarSectionConfig
  | HeroCarouselSectionConfig
  | PromoTilesSectionConfig
  | FeaturedTabsSectionConfig
  | WeekDealsSectionConfig
  | CategoryProductRowSectionConfig
  | BrandBannerSectionConfig
  | TopCategoriesGridSectionConfig
  | BrandLogosStripSectionConfig
  | TripleProductListsSectionConfig
  | NewsletterSignupSectionConfig
  | FooterSectionConfig;

export type FeaturedTabData = {
  id: string;
  title: string;
  products: Product[];
};

export type SectionDataMap = {
  featuredTabs: FeaturedTabData[];
  weekDealsProducts: Product[];
  topCategories: Category[];
  allHomeProducts: Product[];
};
