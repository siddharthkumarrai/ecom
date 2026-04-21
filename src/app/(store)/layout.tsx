import { AnnouncementBar } from "@/components/store/layout/AnnouncementBar";
import { Footer } from "@/components/store/layout/Footer";
import { Header } from "@/components/store/layout/Header";
import { getHomeProductsOrMock, getSiteConfigOrMock, getTopCategoriesOrMock } from "@/lib/store/data";
import { getCurrentUserRole, isAdminRole } from "@/lib/auth/roles";
import { PhantomUiLoader } from "@/components/store/shared/PhantomUiLoader";
import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Toaster } from "sonner";

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ANNOUNCEMENT_FONT_WEIGHTS = new Set(["400", "500", "600", "700"]);
const ANNOUNCEMENT_FONT_STYLES = new Set(["normal", "italic"]);
const ANNOUNCEMENT_TEXT_TRANSFORMS = new Set(["none", "uppercase", "capitalize"]);
const ANNOUNCEMENT_ANIMATIONS = new Set(["none", "marquee", "pulse", "fade"]);

function resolveHexColor(value: unknown, fallback: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return HEX_COLOR_RE.test(normalized) ? normalized : fallback;
}

function resolveAnnouncementSize(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(9, Math.min(24, Math.round(parsed))) : fallback;
}

function resolveAnnouncementEnum(value: unknown, allowed: Set<string>, fallback: string) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return allowed.has(normalized) ? normalized : fallback;
}

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const isCmsStorePreview = cookieStore.get("cms_store_preview")?.value === "1";
  const role = await getCurrentUserRole();
  if (isAdminRole(role) && !isCmsStorePreview) redirect("/admin/dashboard");

  const [siteConfigResult, topCategoriesResult, homeProductsResult] = await Promise.all([
    getSiteConfigOrMock(),
    getTopCategoriesOrMock(),
    getHomeProductsOrMock(200),
  ]);
  const config = siteConfigResult.config;
  const categories = topCategoriesResult.source === "db" ? topCategoriesResult.categories : [];
  const products = homeProductsResult.source === "db" ? homeProductsResult.products : [];
  const announcementSectionConfig = (() => {
    const section = config.homepage.sections?.find((entry) => entry.type === "announcement_bar");
    if (!section?.config || typeof section.config !== "object" || Array.isArray(section.config)) return {} as Record<string, unknown>;
    return section.config;
  })();
  const announcementText = typeof announcementSectionConfig.text === "string" && announcementSectionConfig.text.trim()
    ? announcementSectionConfig.text.trim()
    : config.announcement.text;
  const announcementTextColor = resolveHexColor(announcementSectionConfig.textColor, config.appearance.announcementText);
  const announcementFontSize = resolveAnnouncementSize(announcementSectionConfig.fontSize, config.appearance.announcementFontSize);
  const announcementFontWeight = resolveAnnouncementEnum(
    announcementSectionConfig.fontWeight,
    ANNOUNCEMENT_FONT_WEIGHTS,
    resolveAnnouncementEnum(config.appearance.announcementFontWeight, ANNOUNCEMENT_FONT_WEIGHTS, "500")
  );
  const announcementFontStyle = resolveAnnouncementEnum(
    announcementSectionConfig.fontStyle,
    ANNOUNCEMENT_FONT_STYLES,
    resolveAnnouncementEnum(config.appearance.announcementFontStyle, ANNOUNCEMENT_FONT_STYLES, "normal")
  );
  const announcementTextTransform = resolveAnnouncementEnum(
    announcementSectionConfig.textTransform,
    ANNOUNCEMENT_TEXT_TRANSFORMS,
    resolveAnnouncementEnum(config.appearance.announcementTextTransform, ANNOUNCEMENT_TEXT_TRANSFORMS, "none")
  );
  const announcementAnimation = resolveAnnouncementEnum(
    announcementSectionConfig.animation,
    ANNOUNCEMENT_ANIMATIONS,
    resolveAnnouncementEnum(config.appearance.announcementAnimation, ANNOUNCEMENT_ANIMATIONS, "marquee")
  );
  const layoutStyle = {
    backgroundColor: config.appearance.pageBg,
    "--content-px-mobile": `${config.appearance.contentPaddingMobile}px`,
    "--content-px-desktop": `${config.appearance.contentPaddingDesktop}px`,
  } as CSSProperties;

  return (
    <div className="min-h-screen overflow-x-hidden text-zinc-900 [--content-px-desktop:40px] [--content-px-mobile:24px]" style={layoutStyle}>
      <PhantomUiLoader />
      {config.announcement.isEnabled ? (
        <AnnouncementBar
          text={announcementText}
          backgroundColor={config.appearance.announcementBg}
          textColor={announcementTextColor}
          fontSize={announcementFontSize}
          fontWeight={announcementFontWeight}
          fontStyle={announcementFontStyle}
          textTransform={announcementTextTransform}
          animation={announcementAnimation}
          topBarLinks={config.topBarLinks}
        />
      ) : null}
      <Header
        supportPhone={config.nav.supportPhone}
        categories={categories}
        products={products}
        appearance={config.appearance}
        navActions={config.navActions}
        topBarLinks={config.topBarLinks}
        allCategoryLabel={config.navigation.allCategoryLabel}
        branding={config.branding}
        allCategoriesMenuLabels={config.navigation.allCategoriesMenu}
        searchPlaceholder={config.navigation.searchPlaceholder}
        searchCategoryLabel={config.navigation.searchCategoryLabel}
        superDealsLabel={config.navigation.superDealsLabel}
        customerCareLabel={config.navigation.customerCareLabel}
        topNavCategoryLimit={config.navigation.topNavCategoryLimit}
      />
      <div className="w-full px-[var(--content-px-mobile)] py-4 md:px-[var(--content-px-desktop)]">
        {children}
      </div>
      <Toaster richColors position="top-right" />
      <Footer
        columns={config.footer.columns}
        phones={config.footer.phones}
        address={config.footer.address}
        socialLinks={config.footer.socialLinks}
        newsletterText={config.footer.newsletterText}
        newsletterPlaceholder={config.footer.newsletterPlaceholder}
        newsletterButtonText={config.footer.newsletterButtonText}
        navbarBg={config.appearance.navbarBg}
        storeName={config.branding.storeName}
        logoUrl={config.branding.logoUrl}
      />
    </div>
  );
}
