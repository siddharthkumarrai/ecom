import type { Brand, Category, Product, SiteConfig } from "@/lib/store/types";

export const categories: Category[] = [
  { id: "c1", name: "LED", slug: "led" },
  { id: "c2", name: "Resistor", slug: "resistor" },
  { id: "c3", name: "Capacitors", slug: "capacitors" },
  { id: "c4", name: "IC", slug: "ic" },
  { id: "c5", name: "Metal Oxide Varistor", slug: "metal-oxide-varistor" },
];

export const brands: Brand[] = [
  { id: "b1", name: "Everstar", slug: "everstar" },
  { id: "b2", name: "Viking", slug: "viking" },
  { id: "b3", name: "Luminus", slug: "luminus" },
  { id: "b4", name: "BPS", slug: "bps" },
];

export const products: Product[] = [
  {
    id: "p1",
    slug: "led-2835-1w-18v-amber-l1-a590",
    name: "LED 2835 1W 18V Amber L1-A590",
    partNumber: "E-2835-1W18V-L1-A590",
    categorySlug: "led",
    brandSlug: "everstar",
    image: "/next.svg",
    costPrice: 0.39,
    sellingPrice: 0.29,
    price: 0.29,
    stock: 20000,
    rating: 4.2,
    description: "High-brightness LED for signage and backlight applications.",
    specifications: [
      { key: "Package", value: "2835" },
      { key: "Voltage", value: "18V" },
      { key: "Color", value: "Amber" },
    ],
  },
  {
    id: "p2",
    slug: "viking-10pf50v-x7r-1206",
    name: "VIKING 10PF/50V X7R 1206",
    partNumber: "VIK-10PF-50V-X7R-1206",
    categorySlug: "capacitors",
    brandSlug: "viking",
    image: "/vercel.svg",
    costPrice: 0.62,
    sellingPrice: 0.51,
    price: 0.51,
    stock: 4000,
    rating: 4.1,
    description: "General-purpose ceramic capacitor for embedded designs.",
    specifications: [
      { key: "Capacitance", value: "10pF" },
      { key: "Voltage", value: "50V" },
      { key: "Package", value: "1206" },
    ],
  },
  {
    id: "p3",
    slug: "led-2835-05w-3v-l2-865",
    name: "LED 2835 0.5W 3V L2-865",
    partNumber: "LED-2835-0.5W-3V-L2-865",
    categorySlug: "led",
    brandSlug: "luminus",
    image: "/next.svg",
    costPrice: 0.23,
    sellingPrice: 0.187,
    price: 0.187,
    stock: 9000,
    rating: 4.4,
    description: "Neutral white LED suitable for indoor linear fixtures.",
    specifications: [
      { key: "Power", value: "0.5W" },
      { key: "Voltage", value: "3V" },
      { key: "CCT", value: "6500K" },
    ],
  },
];

export const siteConfig: SiteConfig = {
  announcement: { isEnabled: true, text: "Free shipping above Rs 500 and same-day dispatch before 2 PM." },
  nav: {
    supportPhone: "+91 77100 12135",
    topCategories: categories.map((category) => category.slug),
  },
  navigation: {
    allCategoryLabel: "All Category",
    allCategoriesMenu: {
      viewAllBrandsLabel: "View All Brands",
      viewAllCategoriesLabel: "View All Categories",
    },
    searchPlaceholder: "Search for products",
    searchCategoryLabel: "All Categories",
    superDealsLabel: "Super Deals",
    customerCareLabel: "Customer Care",
    topNavCategoryLimit: 6,
  },
  branding: {
    storeName: "lumenskart",
    logoUrl: "",
  },
  sections: [
    { id: "s1", type: "featured", title: "Featured Products" },
    { id: "s2", type: "onsale", title: "Onsale Products" },
    { id: "s3", type: "topRated", title: "Top Rated Products" },
  ],
  footer: {
    columns: [
      {
        title: "Find It Fast",
        links: categories.map((category) => ({
          label: category.name,
          href: `/category/${category.slug}`,
        })),
      },
      {
        title: "Customer Care",
        links: [
          { label: "About", href: "#" },
          { label: "Contact", href: "#" },
          { label: "Privacy Policy", href: "#" },
          { label: "Refund and Return", href: "#" },
        ],
      },
    ],
    phones: ["+91 77100 12135", "+91 82919 14647"],
    address: "#809/810, 8th Floor, Tower-B, Lodha Supremus, Kolshet Road, Thane West - 400607",
    newsletterText: "Sign up to Newsletter and receive Rs 200 coupon for first shopping.",
    newsletterPlaceholder: "Email address",
    newsletterButtonText: "Sign Up",
  },
  appearance: {
    pageBg: "#f7f7f7",
    announcementBg: "#ffffff",
    announcementText: "#5f6368",
    navbarBg: "#f5c400",
    navbarText: "#1f2937",
    navbarIconColor: "#1f2937",
    productActionButtonBg: "#f5c400",
    productActionButtonHoverBg: "#ffd84d",
    contentPaddingMobile: 24,
    contentPaddingDesktop: 40,
  },
  topBarLinks: {
    myAccountLabel: "My Account",
    registerLabel: "Register",
    loginLabel: "Login",
    showAuthLinks: true,
  },
  navActions: {
    showCompare: true,
    showWishlist: true,
    showCart: true,
    cartLabel: "₹0",
  },
  homepage: {
    hero: {
      eyebrow: "Lumenskart Electronics",
      title: "B2B + B2C Components Marketplace",
      description: "LEDs, resistors, capacitors, ICs, MOSFETs and connectors with quantity pricing and business checkout workflows.",
      primaryCtaLabel: "Browse LEDs",
      primaryCtaHref: "/category/led",
      secondaryCtaLabel: "Shop by Brand",
      secondaryCtaHref: "/brands/everstar",
    },
    brandStrip: ["E-tron", "Viking", "Luminus", "Everstar", "IKO Power", "BPS"],
    productSectionTitles: ["Featured Products", "Onsale Products", "Top Rated Products"],
    categorySections: [
      {
        categorySlug: "ic",
        title: "IC",
        isEnabled: true,
        order: 1,
        productLimit: 6,
        promoImageUrl: "/hero-placeholder.svg",
        promoHref: "/category/ic",
        promoAlt: "IC collection",
      },
      {
        categorySlug: "led",
        title: "LED",
        isEnabled: true,
        order: 2,
        productLimit: 6,
        promoImageUrl: "/hero-placeholder.svg",
        promoHref: "/category/led",
        promoAlt: "LED collection",
      },
      { categorySlug: "capacitors", title: "Capacitors", isEnabled: true, order: 3, productLimit: 6, promoImageUrl: "", promoHref: "", promoAlt: "" },
    ],
    heroCarousel: {
      autoplayMs: 4200,
      slides: [
        {
          title: "Stay With Our Advanced IC Technologies",
          subtitle: "Reliable component sourcing for manufacturing scale.",
          ctaLabel: "Explore Now",
          ctaHref: "/category/all",
          imageUrl: "/next.svg",
        },
        {
          title: "High Efficiency Components",
          subtitle: "Better quality and stable lead times for your production.",
          ctaLabel: "Shop Components",
          ctaHref: "/category/all",
          imageUrl: "/vercel.svg",
        },
      ],
      sideCards: [
        {
          title: "Highest Lumens Per Watt",
          subtitle: "LED Series",
          ctaLabel: "Shop now",
          ctaHref: "/category/led",
          imageUrl: "/next.svg",
        },
        {
          title: "Industry Standardized Capacitors",
          subtitle: "Capacitor Range",
          ctaLabel: "Shop now",
          ctaHref: "/category/capacitors",
          imageUrl: "/vercel.svg",
        },
        {
          title: "Catch Big Deals Resistors",
          subtitle: "Bulk Offers",
          ctaLabel: "Shop now",
          ctaHref: "/category/resistor",
          imageUrl: "/next.svg",
        },
      ],
    },
    featuredTabs: [
      { id: "featured", title: "Featured", productIds: ["p1", "p2", "p3"] },
      { id: "onsale", title: "On Sale", productIds: ["p1", "p2", "p3"] },
      { id: "top-rated", title: "Top Rated", productIds: ["p3", "p1", "p2"] },
    ],
    weekDeals: {
      title: "Week Deals limited, Just now",
      subtitle: "Hurry Up! Offer ends in:",
      endsAt: "2026-12-31T23:59:59.000Z",
      productIds: ["p1", "p2", "p3"],
    },
    topCategories: {
      title: "Top Categories this Week",
      categorySlugs: ["ic", "capacitors", "led"],
    },
  },
  account: {
    sidebar: {
      dashboardLabel: "Dashboard",
      ordersLabel: "Order History",
      wishlistLabel: "Wishlist",
      conversationsLabel: "Conversations",
      supportLabel: "Support Ticket",
      profileLabel: "Manage Profile",
      signOutLabel: "Sign Out",
    },
    dashboard: {
      totalExpenditureLabel: "Total Expenditure",
      viewOrderHistoryLabel: "View Order History",
      wishlistHeading: "My Wishlist",
      wishlistEmptyText: "There isn't anything added yet",
      productsInCartLabel: "Products in Cart",
      productsInWishlistLabel: "Products in Wishlist",
      totalProductsOrderedLabel: "Total Products Ordered",
      defaultShippingAddressLabel: "Default Shipping Address",
      addNewAddressLabel: "Add New Address",
    },
    orders: {
      heading: "Order History",
      emptyText: "No orders yet.",
      orderIdLabel: "Order Id",
      dateLabel: "Date",
      amountLabel: "Amount",
      deliveryStatusLabel: "Delivery Status",
      paymentStatusLabel: "Payment Status",
      optionsLabel: "Options",
    },
    wishlist: { heading: "Wishlist", emptyText: "There isn't anything added yet" },
    conversations: {
      heading: "Conversations",
      subtext: "Select a conversation to view all messages.",
      emptyText: "There isn't anything added yet",
    },
    support: {
      heading: "Support Ticket",
      createButtonLabel: "Create a Ticket",
      emptyText: "No support tickets.",
      ticketIdLabel: "Ticket ID",
      sendingDateLabel: "Sending Date",
      subjectLabel: "Subject",
      statusLabel: "Status",
      optionsLabel: "Options",
    },
    profile: {
      heading: "Manage Profile",
      basicInfoHeading: "Basic Info",
      yourNameLabel: "Your name",
      yourNamePlaceholder: "Your name",
      yourPhoneLabel: "Your Phone",
      yourPhonePlaceholder: "Your Phone",
      photoLabel: "Photo",
      salesCodeLabel: "Sales Code",
      salesCodePlaceholder: "Sales",
      yourPasswordLabel: "Your Password",
      yourPasswordPlaceholder: "New Password",
      confirmPasswordLabel: "Confirm Password",
      confirmPasswordPlaceholder: "Confirm Password",
      updateProfileButtonLabel: "Update Profile",
      addressHeading: "Address",
      changeEmailHeading: "Change your email",
      yourEmailLabel: "Your Email",
      verifyButtonLabel: "Verify",
      updateEmailButtonLabel: "Update Email",
    },
  },
};

export function getProductsByCategory(slug: string) {
  return products.filter((product) => product.categorySlug === slug);
}

export function getProductsByBrand(slug: string) {
  return products.filter((product) => product.brandSlug === slug);
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
