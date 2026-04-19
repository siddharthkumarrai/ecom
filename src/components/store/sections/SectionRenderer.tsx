import { getSectionData } from "@/lib/storefront/getSectionData";
import type { SiteConfig } from "@/lib/store/types";
import type { HomepageSection } from "@/lib/storefront/types";
import { sectionRegistry } from "@/components/store/sections/registry";
import type { ReactElement } from "react";

export async function SectionRenderer({
  sections,
  siteConfig,
}: {
  sections: HomepageSection[];
  siteConfig: SiteConfig;
}) {
  const sectionData = await getSectionData(siteConfig);
  const renderedSections: ReactElement[] = [];

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const nextSection = sections[index + 1];

    // Hero owns the full above-the-fold row (slider + right stack).
    // If a legacy promo_tiles section follows hero, skip it to avoid duplicates.
    if (section.type === "hero_carousel") {
      const HeroComponent = sectionRegistry.hero_carousel;
      const hasHeroSideCards =
        Array.isArray(section.config?.sideCards) && section.config.sideCards.length > 0;
      const canInheritLegacyPromoCards =
        nextSection?.type === "promo_tiles" &&
        Array.isArray(nextSection.config?.cards) &&
        nextSection.config.cards.length > 0 &&
        !hasHeroSideCards;
      const heroSectionForRender = canInheritLegacyPromoCards
        ? {
            ...section,
            config: {
              ...section.config,
              sideCards: nextSection.config.cards,
            },
          }
        : section;
      renderedSections.push(
        <HeroComponent
          key={heroSectionForRender.id}
          section={heroSectionForRender}
          siteConfig={siteConfig}
          sectionData={sectionData}
        />
      );

      // If legacy promo section follows hero, skip it to avoid duplicate right stack.
      if (nextSection?.type === "promo_tiles") {
        index += 1;
      }
      continue;
    }

    const Component = sectionRegistry[section.type];
    if (!Component) continue;
    renderedSections.push(
      <Component
        key={section.id}
        section={section}
        siteConfig={siteConfig}
        sectionData={sectionData}
      />
    );
  }

  return <main className="space-y-4 bg-[#efefef] pb-4 md:space-y-5">{renderedSections}</main>;
}
