import { BrandLogosStripSection } from "@/components/store/sections/BrandLogosStripSection";
import { TripleProductListsSection } from "@/components/store/sections/TripleProductListsSection";
import { cn } from "@/lib/utils";
import { getSectionData } from "@/lib/storefront/getSectionData";
import { getHomepageConfig } from "@/lib/storefront/getHomepageConfig";
import type { HomepageSection } from "@/lib/storefront/types";

function toRenderableSection(section: HomepageSection): HomepageSection & { config: Record<string, unknown> } {
  return {
    ...section,
    config: (section.config ?? {}) as Record<string, unknown>,
  };
}

export async function StoreBottomSections({ className }: { className?: string }) {
  const homepage = await getHomepageConfig();
  const brandLogosSection = homepage.sections.find((section) => section.type === "brand_logos_strip");
  const tripleProductListsSection = homepage.sections.find((section) => section.type === "triple_product_lists");

  if (!brandLogosSection && !tripleProductListsSection) return null;

  const sectionData = await getSectionData(homepage.config);

  return (
    <section className={cn("space-y-4 md:space-y-5", className)}>
      {brandLogosSection ? (
        <BrandLogosStripSection
          section={toRenderableSection(brandLogosSection)}
          siteConfig={homepage.config}
          sectionData={sectionData}
        />
      ) : null}
      {tripleProductListsSection ? (
        <TripleProductListsSection
          section={toRenderableSection(tripleProductListsSection)}
          siteConfig={homepage.config}
          sectionData={sectionData}
        />
      ) : null}
    </section>
  );
}

