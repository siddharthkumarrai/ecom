import { connectDB } from "@/lib/db/mongoose";
import { SiteConfig } from "@/lib/db/models/SiteConfig.model";
import { error, json } from "@/lib/api/response";
import { z } from "zod";

export async function GET() {
  await connectDB();
  const config = await SiteConfig.findOne({ key: "main" }).lean();
  return json({ config });
}

const PatchSchema = z.object({
  announcement: z
    .object({
      isEnabled: z.boolean().optional(),
      scrollSpeed: z.number().int().min(1).max(200).optional(),
      messages: z
        .array(
          z.object({
            text: z.string().min(1),
            link: z.string().optional(),
            bgColor: z.string().optional(),
            textColor: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  navigation: z
    .object({
      topCategories: z.array(z.string()).optional(),
      allCategoryLabel: z.string().optional(),
      allCategoriesMenu: z
        .object({
          viewAllBrandsLabel: z.string().optional(),
          viewAllCategoriesLabel: z.string().optional(),
        })
        .optional(),
      megaMenu: z
        .array(
          z.object({
            label: z.string(),
            href: z.string(),
            children: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
          })
        )
        .optional(),
      searchPlaceholder: z.string().optional(),
      searchCategoryLabel: z.string().optional(),
      superDealsLabel: z.string().optional(),
      customerCareLabel: z.string().optional(),
      topNavCategoryLimit: z.number().int().min(0).max(20).optional(),
    })
    .optional(),
  branding: z
    .object({
      storeName: z.string().optional(),
      logoUrl: z.string().optional(),
    })
    .optional(),
  footer: z
    .object({
      columns: z
        .array(
          z.object({
            title: z.string(),
            links: z.array(z.object({ label: z.string(), href: z.string() })),
          })
        )
        .optional(),
      contactPhone: z.array(z.string()).optional(),
      contactAddress: z.string().optional(),
      newsletterText: z.string().optional(),
      newsletterPlaceholder: z.string().optional(),
      newsletterButtonText: z.string().optional(),
    })
    .optional(),
  seo: z
    .object({
      siteName: z.string().optional(),
      logoUrl: z.string().optional(),
      defaultTitle: z.string().optional(),
      defaultDescription: z.string().optional(),
      ogImage: z.string().optional(),
      favicon: z.string().optional(),
    })
    .optional(),
  shipping: z
    .object({
      freeShippingThreshold: z.number().optional(),
      defaultShippingCharge: z.number().optional(),
      taxPercent: z.number().min(0).max(100).optional(),
      codCharge: z.number().optional(),
      codMinimumOrder: z.number().optional(),
      codMaximumOrder: z.number().optional(),
      isCODGloballyEnabled: z.boolean().optional(),
      prepaidDiscountPercent: z.number().optional(),
    })
    .optional(),
  payment: z
    .object({
      activeProvider: z.string().optional(),
      upiDirectEnabled: z.boolean().optional(),
      bankTransferEnabled: z.boolean().optional(),
    })
    .optional(),
  promotions: z
    .object({
      coupons: z
        .array(
          z.object({
            code: z.string().min(1),
            label: z.string().optional(),
            type: z.enum(["percent", "fixed"]),
            appliesTo: z.enum(["order", "product", "category"]).optional(),
            targetIds: z.array(z.string()).optional(),
            value: z.number().min(0),
            minOrderAmount: z.number().min(0).optional(),
            maxDiscountAmount: z.number().min(0).optional(),
            usageLimit: z.number().int().min(0).optional(),
            perUserLimit: z.number().int().min(0).optional(),
            startsAt: z.string().optional(),
            endsAt: z.string().optional(),
            firstOrderOnly: z.boolean().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  appearance: z
    .object({
      pageBg: z.string().optional(),
      announcementBg: z.string().optional(),
      announcementText: z.string().optional(),
      navbarBg: z.string().optional(),
      navbarText: z.string().optional(),
      navbarIconColor: z.string().optional(),
      productActionButtonBg: z.string().optional(),
      productActionButtonHoverBg: z.string().optional(),
      contentPaddingMobile: z.number().optional(),
      contentPaddingDesktop: z.number().optional(),
    })
    .optional(),
  topBarLinks: z
    .object({
      myAccountLabel: z.string().optional(),
      registerLabel: z.string().optional(),
      loginLabel: z.string().optional(),
      showAuthLinks: z.boolean().optional(),
    })
    .optional(),
  navActions: z
    .object({
      showCompare: z.boolean().optional(),
      showWishlist: z.boolean().optional(),
      showCart: z.boolean().optional(),
      cartLabel: z.string().optional(),
    })
    .optional(),
  homepage: z
    .object({
      sections: z
        .array(
          z.object({
            id: z.string().min(1),
            type: z.string().min(1),
            order: z.number().int(),
            enabled: z.boolean(),
            config: z.record(z.string(), z.unknown()).optional(),
          })
        )
        .optional(),
      hero: z
        .object({
          eyebrow: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          primaryCtaLabel: z.string().optional(),
          primaryCtaHref: z.string().optional(),
          secondaryCtaLabel: z.string().optional(),
          secondaryCtaHref: z.string().optional(),
        })
        .optional(),
      brandStrip: z.array(z.string()).optional(),
      productSectionTitles: z.array(z.string()).optional(),
      categorySections: z
        .array(
          z.object({
            categorySlug: z.string().min(1),
            title: z.string().optional(),
            isEnabled: z.boolean().optional(),
            order: z.number().int().optional(),
            productLimit: z.number().int().min(1).max(24).optional(),
            promoImageUrl: z.string().optional(),
            promoHref: z.string().optional(),
            promoAlt: z.string().optional(),
          })
        )
        .optional(),
      heroCarousel: z
        .object({
          autoplayMs: z.number().int().min(1000).max(20000).optional(),
          slides: z
            .array(
              z.object({
                title: z.string(),
                subtitle: z.string(),
                ctaLabel: z.string(),
                ctaHref: z.string(),
                imageUrl: z.string().optional(),
              })
            )
            .optional(),
          sideCards: z
            .array(
              z.object({
                title: z.string(),
                subtitle: z.string(),
                ctaLabel: z.string(),
                ctaHref: z.string(),
                imageUrl: z.string().optional(),
              })
            )
            .optional(),
        })
        .optional(),
      featuredTabs: z
        .array(
          z.object({
            id: z.string().min(1),
            title: z.string().min(1),
            productIds: z.array(z.string()).optional(),
          })
        )
        .optional(),
      weekDeals: z
        .object({
          title: z.string().optional(),
          subtitle: z.string().optional(),
          endsAt: z.string().optional(),
          productIds: z.array(z.string()).optional(),
        })
        .optional(),
      topCategories: z
        .object({
          title: z.string().optional(),
          categorySlugs: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
  account: z
    .object({
      sidebar: z
        .object({
          dashboardLabel: z.string().optional(),
          ordersLabel: z.string().optional(),
          wishlistLabel: z.string().optional(),
          conversationsLabel: z.string().optional(),
          supportLabel: z.string().optional(),
          profileLabel: z.string().optional(),
          signOutLabel: z.string().optional(),
        })
        .optional(),
      dashboard: z
        .object({
          totalExpenditureLabel: z.string().optional(),
          viewOrderHistoryLabel: z.string().optional(),
          wishlistHeading: z.string().optional(),
          wishlistEmptyText: z.string().optional(),
          productsInCartLabel: z.string().optional(),
          productsInWishlistLabel: z.string().optional(),
          totalProductsOrderedLabel: z.string().optional(),
          defaultShippingAddressLabel: z.string().optional(),
          addNewAddressLabel: z.string().optional(),
        })
        .optional(),
      orders: z
        .object({
          heading: z.string().optional(),
          emptyText: z.string().optional(),
          orderIdLabel: z.string().optional(),
          dateLabel: z.string().optional(),
          amountLabel: z.string().optional(),
          deliveryStatusLabel: z.string().optional(),
          paymentStatusLabel: z.string().optional(),
          optionsLabel: z.string().optional(),
        })
        .optional(),
      wishlist: z.object({ heading: z.string().optional(), emptyText: z.string().optional() }).optional(),
      conversations: z
        .object({
          heading: z.string().optional(),
          subtext: z.string().optional(),
          emptyText: z.string().optional(),
        })
        .optional(),
      support: z
        .object({
          heading: z.string().optional(),
          createButtonLabel: z.string().optional(),
          emptyText: z.string().optional(),
          ticketIdLabel: z.string().optional(),
          sendingDateLabel: z.string().optional(),
          subjectLabel: z.string().optional(),
          statusLabel: z.string().optional(),
          optionsLabel: z.string().optional(),
        })
        .optional(),
      profile: z
        .object({
          heading: z.string().optional(),
          basicInfoHeading: z.string().optional(),
          yourNameLabel: z.string().optional(),
          yourNamePlaceholder: z.string().optional(),
          yourPhoneLabel: z.string().optional(),
          yourPhonePlaceholder: z.string().optional(),
          photoLabel: z.string().optional(),
          salesCodeLabel: z.string().optional(),
          salesCodePlaceholder: z.string().optional(),
          yourPasswordLabel: z.string().optional(),
          yourPasswordPlaceholder: z.string().optional(),
          confirmPasswordLabel: z.string().optional(),
          confirmPasswordPlaceholder: z.string().optional(),
          updateProfileButtonLabel: z.string().optional(),
          addressHeading: z.string().optional(),
          changeEmailHeading: z.string().optional(),
          yourEmailLabel: z.string().optional(),
          verifyButtonLabel: z.string().optional(),
          updateEmailButtonLabel: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid payload", 400, parsed.error.flatten());

  await connectDB();
  const updated = await SiteConfig.findOneAndUpdate(
    { key: "main" },
    { $set: parsed.data },
    { upsert: true, returnDocument: "after" }
  ).lean();

  return json({ config: updated });
}
