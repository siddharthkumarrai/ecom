import type { SiteConfig } from "@/lib/store/types";
import type { HomepageSection, SectionDataMap, SectionType } from "@/lib/storefront/types";
import type { ReactElement } from "react";
import { AnnouncementBarSection } from "@/components/store/sections/AnnouncementBarSection";
import { NavbarSection } from "@/components/store/sections/NavbarSection";
import { HeroCarouselSection } from "@/components/store/sections/HeroCarouselSection";
import { PromoTilesSection } from "@/components/store/sections/PromoTilesSection";
import { FeaturedTabsSection } from "@/components/store/sections/FeaturedTabsSection";
import { WeekDealsSection } from "@/components/store/sections/WeekDealsSection";
import { CategoryProductRowSection } from "@/components/store/sections/CategoryProductRowSection";
import { BrandBannerSection } from "@/components/store/sections/BrandBannerSection";
import { TopCategoriesGridSection } from "@/components/store/sections/TopCategoriesGridSection";
import { BrandLogosStripSection } from "@/components/store/sections/BrandLogosStripSection";
import { TripleProductListsSection } from "@/components/store/sections/TripleProductListsSection";
import { NewsletterSignupSection } from "@/components/store/sections/NewsletterSignupSection";
import { FooterSection } from "@/components/store/sections/FooterSection";

export type SectionRenderProps = {
  section: HomepageSection & { config: Record<string, unknown> };
  siteConfig: SiteConfig;
  sectionData: SectionDataMap;
};

export type SectionComponent = (props: SectionRenderProps) => Promise<ReactElement | null> | ReactElement | null;

export const sectionRegistry: Record<SectionType, SectionComponent> = {
  announcement_bar: AnnouncementBarSection,
  navbar: NavbarSection,
  hero_carousel: HeroCarouselSection,
  promo_tiles: PromoTilesSection,
  featured_tabs: FeaturedTabsSection,
  week_deals: WeekDealsSection,
  category_product_row: CategoryProductRowSection,
  brand_banner: BrandBannerSection,
  top_categories_grid: TopCategoriesGridSection,
  brand_logos_strip: BrandLogosStripSection,
  triple_product_lists: TripleProductListsSection,
  newsletter_signup: NewsletterSignupSection,
  footer: FooterSection,
};
