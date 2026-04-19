export type HomepageSectionType = "featured" | "onsale" | "topRated";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  partNumber: string;
  categorySlug: string;
  brandSlug: string;
  brandName?: string;
  image: string;
  images?: string[];
  costPrice?: number;
  sellingPrice: number;
  price: number;
  stock: number;
  rating: number;
  reviewCount?: number;
  description: string;
  richDescription?: string;
  specifications: Array<{ key: string; value: string }>;
  technicalDocuments?: Array<{ name: string; url: string }>;
}

export interface HomeSection {
  id: string;
  type: HomepageSectionType;
  title: string;
}

export interface SiteConfig {
  announcement: { isEnabled: boolean; text: string };
  nav: {
    supportPhone: string;
    topCategories: string[];
  };
  navigation: {
    allCategoryLabel: string;
    allCategoriesMenu: {
      viewAllBrandsLabel: string;
      viewAllCategoriesLabel: string;
    };
    searchPlaceholder: string;
    searchCategoryLabel: string;
    superDealsLabel: string;
    customerCareLabel: string;
    topNavCategoryLimit: number;
  };
  branding: {
    storeName: string;
    logoUrl: string;
  };
  sections: HomeSection[];
  footer: {
    columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
    phones: string[];
    address: string;
    socialLinks?: Array<{ platform: string; url: string; logoUrl?: string }>;
    newsletterText: string;
    newsletterPlaceholder: string;
    newsletterButtonText: string;
  };
  appearance: {
    pageBg: string;
    announcementBg: string;
    announcementText: string;
    navbarBg: string;
    navbarText: string;
    navbarIconColor: string;
    productActionButtonBg: string;
    productActionButtonHoverBg: string;
    contentPaddingMobile: number;
    contentPaddingDesktop: number;
  };
  topBarLinks: {
    myAccountLabel: string;
    registerLabel: string;
    loginLabel: string;
    showAuthLinks: boolean;
  };
  navActions: {
    showCompare: boolean;
    showWishlist: boolean;
    showCart: boolean;
    cartLabel: string;
  };
  homepage: {
    sections?: Array<{
      id: string;
      type: string;
      order: number;
      enabled: boolean;
      config?: Record<string, unknown>;
    }>;
    hero: {
      eyebrow: string;
      title: string;
      description: string;
      primaryCtaLabel: string;
      primaryCtaHref: string;
      secondaryCtaLabel: string;
      secondaryCtaHref: string;
    };
    brandStrip: string[];
    productSectionTitles: string[];
    categorySections: Array<{
      categorySlug: string;
      title: string;
      isEnabled: boolean;
      order: number;
      productLimit: number;
      anchorTitle: string;
      anchorHref: string;
      promoImageUrl: string;
      promoHref: string;
      promoAlt: string;
    }>;
    heroCarousel: {
      autoplayMs: number;
      slides: Array<{
        title: string;
        subtitle: string;
        ctaLabel: string;
        ctaHref: string;
        imageUrl: string;
      }>;
      sideCards: Array<{
        title: string;
        subtitle: string;
        ctaLabel: string;
        ctaHref: string;
        imageUrl: string;
      }>;
    };
    featuredTabs: Array<{
      id: string;
      title: string;
      productIds: string[];
    }>;
    weekDeals: {
      title: string;
      subtitle: string;
      endsAt: string;
      productIds: string[];
    };
    topCategories: {
      title: string;
      categorySlugs: string[];
    };
  };
  account: {
    sidebar: {
      dashboardLabel: string;
      ordersLabel: string;
      wishlistLabel: string;
      conversationsLabel: string;
      supportLabel: string;
      profileLabel: string;
      signOutLabel: string;
    };
    dashboard: {
      totalExpenditureLabel: string;
      viewOrderHistoryLabel: string;
      wishlistHeading: string;
      wishlistEmptyText: string;
      productsInCartLabel: string;
      productsInWishlistLabel: string;
      totalProductsOrderedLabel: string;
      defaultShippingAddressLabel: string;
      addNewAddressLabel: string;
    };
    orders: {
      heading: string;
      emptyText: string;
      orderIdLabel: string;
      dateLabel: string;
      amountLabel: string;
      deliveryStatusLabel: string;
      paymentStatusLabel: string;
      optionsLabel: string;
    };
    wishlist: { heading: string; emptyText: string };
    conversations: { heading: string; subtext: string; emptyText: string };
    support: {
      heading: string;
      createButtonLabel: string;
      emptyText: string;
      ticketIdLabel: string;
      sendingDateLabel: string;
      subjectLabel: string;
      statusLabel: string;
      optionsLabel: string;
    };
    profile: {
      heading: string;
      basicInfoHeading: string;
      yourNameLabel: string;
      yourNamePlaceholder: string;
      yourPhoneLabel: string;
      yourPhonePlaceholder: string;
      photoLabel: string;
      salesCodeLabel: string;
      salesCodePlaceholder: string;
      yourPasswordLabel: string;
      yourPasswordPlaceholder: string;
      confirmPasswordLabel: string;
      confirmPasswordPlaceholder: string;
      updateProfileButtonLabel: string;
      addressHeading: string;
      changeEmailHeading: string;
      yourEmailLabel: string;
      verifyButtonLabel: string;
      updateEmailButtonLabel: string;
    };
  };
}
