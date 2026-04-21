import mongoose, { type InferSchemaType } from "mongoose";

const AnnouncementMessageSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    link: { type: String },
    bgColor: { type: String, default: "#F5C400" },
    textColor: { type: String, default: "#000000" },
  },
  { _id: false }
);

const SiteConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, // "main"
    announcement: {
      isEnabled: { type: Boolean, default: true },
      messages: { type: [AnnouncementMessageSchema], default: [] },
      scrollSpeed: { type: Number, default: 30 },
    },
    navigation: {
      topCategories: { type: [String], default: [] },
      allCategoryLabel: { type: String, default: "All Category" },
      allCategoriesMenu: {
        viewAllBrandsLabel: { type: String, default: "View All Brands" },
        viewAllCategoriesLabel: { type: String, default: "View All Categories" },
      },
      searchPlaceholder: { type: String, default: "Search for products" },
      searchCategoryLabel: { type: String, default: "All Categories" },
      superDealsLabel: { type: String, default: "Super Deals" },
      customerCareLabel: { type: String, default: "Customer Care" },
      topNavCategoryLimit: { type: Number, default: 6 },
      megaMenu: {
        type: [
          {
            label: String,
            href: String,
            children: [{ label: String, href: String }],
          },
        ],
        default: [],
      },
    },
    branding: {
      storeName: { type: String, default: "lumenskart" },
      logoUrl: { type: String, default: "" },
    },
    footer: {
      columns: {
        type: [
          {
            title: String,
            links: [{ label: String, href: String }],
          },
        ],
        default: [],
      },
      contactPhone: { type: [String], default: [] },
      contactAddress: { type: String, default: "" },
      socialLinks: { type: [{ platform: String, url: String, logoUrl: String }], default: [] },
      newsletterEnabled: { type: Boolean, default: true },
      newsletterCouponValue: { type: Number, default: 0 },
      newsletterText: { type: String, default: "Sign up to Newsletter and receive Rs 200 coupon for first shopping." },
      newsletterPlaceholder: { type: String, default: "Email address" },
      newsletterButtonText: { type: String, default: "Sign Up" },
    },
    appearance: {
      pageBg: { type: String, default: "#f7f7f7" },
      announcementBg: { type: String, default: "#ffffff" },
      announcementText: { type: String, default: "#5f6368" },
      announcementFontSize: { type: Number, default: 11 },
      announcementFontWeight: { type: String, default: "500" },
      announcementFontStyle: { type: String, default: "normal" },
      announcementTextTransform: { type: String, default: "none" },
      announcementAnimation: { type: String, default: "marquee" },
      navbarBg: { type: String, default: "#f5c400" },
      navbarText: { type: String, default: "#1f2937" },
      navbarIconColor: { type: String, default: "#1f2937" },
      productActionButtonBg: { type: String, default: "#f5c400" },
      productActionButtonHoverBg: { type: String, default: "#ffd84d" },
      contentPaddingMobile: { type: Number, default: 24 },
      contentPaddingDesktop: { type: Number, default: 40 },
    },
    topBarLinks: {
      myAccountLabel: { type: String, default: "My Account" },
      registerLabel: { type: String, default: "Register" },
      loginLabel: { type: String, default: "Login" },
      showAuthLinks: { type: Boolean, default: true },
    },
    navActions: {
      showCompare: { type: Boolean, default: true },
      showWishlist: { type: Boolean, default: true },
      showCart: { type: Boolean, default: true },
      cartLabel: { type: String, default: "₹0" },
    },
    homepage: {
      sections: {
        type: [
          {
            id: { type: String, default: "" },
            type: { type: String, default: "" },
            order: { type: Number, default: 0 },
            enabled: { type: Boolean, default: true },
            config: { type: mongoose.Schema.Types.Mixed, default: {} },
          },
        ],
        default: [],
      },
      hero: {
        eyebrow: { type: String, default: "Lumenskart Electronics" },
        title: { type: String, default: "B2B + B2C Components Marketplace" },
        description: {
          type: String,
          default: "LEDs, resistors, capacitors, ICs, MOSFETs and connectors with quantity pricing and business checkout workflows.",
        },
        primaryCtaLabel: { type: String, default: "Browse LEDs" },
        primaryCtaHref: { type: String, default: "/category/led" },
        secondaryCtaLabel: { type: String, default: "Shop by Brand" },
        secondaryCtaHref: { type: String, default: "/brands/everstar" },
      },
      brandStrip: {
        type: [String],
        default: ["E-tron", "Viking", "Luminus", "Everstar", "IKO Power", "BPS"],
      },
      productSectionTitles: {
        type: [String],
        default: ["Featured Products", "Onsale Products", "Top Rated Products"],
      },
      categorySections: {
        type: [
          {
            categorySlug: { type: String, required: true },
            title: { type: String, default: "" },
            isEnabled: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
            productLimit: { type: Number, default: 6 },
            anchorTitle: { type: String, default: "" },
            anchorHref: { type: String, default: "" },
            promoImageUrl: { type: String, default: "" },
            promoHref: { type: String, default: "" },
            promoAlt: { type: String, default: "" },
          },
        ],
        default: [],
      },
      heroCarousel: {
        autoplayMs: { type: Number, default: 4200 },
        slides: {
          type: [
            {
              title: { type: String, default: "" },
              subtitle: { type: String, default: "" },
              ctaLabel: { type: String, default: "" },
              ctaHref: { type: String, default: "" },
              imageUrl: { type: String, default: "" },
            },
          ],
          default: [],
        },
        sideCards: {
          type: [
            {
              title: { type: String, default: "" },
              subtitle: { type: String, default: "" },
              ctaLabel: { type: String, default: "" },
              ctaHref: { type: String, default: "" },
              imageUrl: { type: String, default: "" },
            },
          ],
          default: [],
        },
      },
      featuredTabs: {
        type: [
          {
            id: { type: String, default: "" },
            title: { type: String, default: "" },
            productIds: { type: [String], default: [] },
          },
        ],
        default: [
          { id: "featured", title: "Featured", productIds: [] },
          { id: "onsale", title: "On Sale", productIds: [] },
          { id: "topRated", title: "Top Rated", productIds: [] },
        ],
      },
      weekDeals: {
        title: { type: String, default: "Week Deals limited, Just now" },
        subtitle: { type: String, default: "Hurry Up! Offer ends in:" },
        endsAt: { type: String, default: "" },
        productIds: { type: [String], default: [] },
      },
      topCategories: {
        title: { type: String, default: "Top Categories this Week" },
        categorySlugs: { type: [String], default: [] },
      },
    },
    account: {
      sidebar: {
        dashboardLabel: { type: String, default: "Dashboard" },
        ordersLabel: { type: String, default: "Order History" },
        wishlistLabel: { type: String, default: "Wishlist" },
        conversationsLabel: { type: String, default: "Conversations" },
        supportLabel: { type: String, default: "Support Ticket" },
        profileLabel: { type: String, default: "Manage Profile" },
        signOutLabel: { type: String, default: "Sign Out" },
      },
      dashboard: {
        totalExpenditureLabel: { type: String, default: "Total Expenditure" },
        viewOrderHistoryLabel: { type: String, default: "View Order History" },
        wishlistHeading: { type: String, default: "My Wishlist" },
        wishlistEmptyText: { type: String, default: "There isn't anything added yet" },
        productsInCartLabel: { type: String, default: "Products in Cart" },
        productsInWishlistLabel: { type: String, default: "Products in Wishlist" },
        totalProductsOrderedLabel: { type: String, default: "Total Products Ordered" },
        defaultShippingAddressLabel: { type: String, default: "Default Shipping Address" },
        addNewAddressLabel: { type: String, default: "Add New Address" },
      },
      orders: {
        heading: { type: String, default: "Order History" },
        emptyText: { type: String, default: "No orders yet." },
        orderIdLabel: { type: String, default: "Order Id" },
        dateLabel: { type: String, default: "Date" },
        amountLabel: { type: String, default: "Amount" },
        deliveryStatusLabel: { type: String, default: "Delivery Status" },
        paymentStatusLabel: { type: String, default: "Payment Status" },
        optionsLabel: { type: String, default: "Options" },
      },
      wishlist: {
        heading: { type: String, default: "Wishlist" },
        emptyText: { type: String, default: "There isn't anything added yet" },
      },
      conversations: {
        heading: { type: String, default: "Conversations" },
        subtext: { type: String, default: "Select a conversation to view all messages." },
        emptyText: { type: String, default: "There isn't anything added yet" },
      },
      support: {
        heading: { type: String, default: "Support Ticket" },
        createButtonLabel: { type: String, default: "Create a Ticket" },
        emptyText: { type: String, default: "No support tickets." },
        ticketIdLabel: { type: String, default: "Ticket ID" },
        sendingDateLabel: { type: String, default: "Sending Date" },
        subjectLabel: { type: String, default: "Subject" },
        statusLabel: { type: String, default: "Status" },
        optionsLabel: { type: String, default: "Options" },
      },
      profile: {
        heading: { type: String, default: "Manage Profile" },
        basicInfoHeading: { type: String, default: "Basic Info" },
        yourNameLabel: { type: String, default: "Your name" },
        yourNamePlaceholder: { type: String, default: "Your name" },
        yourPhoneLabel: { type: String, default: "Your Phone" },
        yourPhonePlaceholder: { type: String, default: "Your Phone" },
        photoLabel: { type: String, default: "Photo" },
        salesCodeLabel: { type: String, default: "Sales Code" },
        salesCodePlaceholder: { type: String, default: "Sales" },
        yourPasswordLabel: { type: String, default: "Your Password" },
        yourPasswordPlaceholder: { type: String, default: "New Password" },
        confirmPasswordLabel: { type: String, default: "Confirm Password" },
        confirmPasswordPlaceholder: { type: String, default: "Confirm Password" },
        updateProfileButtonLabel: { type: String, default: "Update Profile" },
        addressHeading: { type: String, default: "Address" },
        changeEmailHeading: { type: String, default: "Change your email" },
        yourEmailLabel: { type: String, default: "Your Email" },
        verifyButtonLabel: { type: String, default: "Verify" },
        updateEmailButtonLabel: { type: String, default: "Update Email" },
      },
    },
    seo: {
      siteName: { type: String, default: "Lumenskart" },
      logoUrl: { type: String, default: "" },
      defaultTitle: { type: String, default: "Lumenskart - Electronic Components" },
      defaultDescription: { type: String, default: "Buy LEDs, Resistors, Capacitors and more" },
      ogImage: { type: String, default: "" },
      favicon: { type: String, default: "" },
      googleAnalyticsId: { type: String, default: "" },
      facebookPixelId: { type: String, default: "" },
    },
    shipping: {
      freeShippingThreshold: { type: Number, default: 500 },
      defaultShippingCharge: { type: Number, default: 50 },
      taxPercent: { type: Number, default: 18 },
      codCharge: { type: Number, default: 30 },
      codMinimumOrder: { type: Number, default: 100 },
      codMaximumOrder: { type: Number, default: 5000 },
      isCODGloballyEnabled: { type: Boolean, default: true },
      prepaidDiscountPercent: { type: Number, default: 0 },
      shippingZones: {
        type: [
          {
            name: String,
            pincodes: [String],
            charge: Number,
            estimatedDays: String,
          },
        ],
        default: [],
      },
      expressShipping: {
        isEnabled: { type: Boolean, default: false },
        charge: { type: Number, default: 100 },
        label: { type: String, default: "Express (1-2 days)" },
      },
    },
    payment: {
      activeProvider: { type: String, default: "razorpay" },
      razorpay: {
        isEnabled: { type: Boolean, default: true },
        displayName: { type: String, default: "Pay Online" },
        supportedMethods: { type: [String], default: ["card", "upi", "netbanking", "wallet"] },
        minAmount: { type: Number, default: 1 },
        maxAmount: { type: Number, default: 500000 },
      },
      upiDirectEnabled: { type: Boolean, default: true },
      bankTransferEnabled: { type: Boolean, default: false },
    },
    promotions: {
      coupons: {
        type: [
          {
            code: { type: String, required: true, uppercase: true, trim: true },
            label: { type: String, default: "" },
            type: { type: String, enum: ["percent", "fixed"], default: "percent" },
            appliesTo: { type: String, enum: ["order", "product", "category"], default: "order" },
            targetIds: { type: [String], default: [] },
            value: { type: Number, default: 0 },
            minOrderAmount: { type: Number, default: 0 },
            maxDiscountAmount: { type: Number, default: 0 },
            usageLimit: { type: Number, default: 0 },
            perUserLimit: { type: Number, default: 0 },
            startsAt: { type: Date, default: null },
            endsAt: { type: Date, default: null },
            firstOrderOnly: { type: Boolean, default: false },
            isActive: { type: Boolean, default: true },
          },
        ],
        default: [],
      },
    },
  },
  { timestamps: true }
);

export type SiteConfigDoc = InferSchemaType<typeof SiteConfigSchema> & { _id: mongoose.Types.ObjectId };

export const SiteConfig =
  (mongoose.models.SiteConfig as mongoose.Model<SiteConfigDoc>) ||
  mongoose.model<SiteConfigDoc>("SiteConfig", SiteConfigSchema);
