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
          text={config.announcement.text}
          backgroundColor={config.appearance.announcementBg}
          textColor={config.appearance.announcementText}
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
