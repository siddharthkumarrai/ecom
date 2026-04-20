import { SectionRenderer } from "@/components/store/sections/SectionRenderer";
import { getHomepageConfig } from "@/lib/storefront/getHomepageConfig";

export const revalidate = 60;

export default async function HomePage() {
  const homepage = await getHomepageConfig();
  return (
    <div className="-mt-8 -mx-[var(--content-px-mobile)] md:mt-0 md:-mx-[var(--content-px-desktop)] lg:-mx-[calc(var(--content-px-desktop)-16px)]">
      <SectionRenderer sections={homepage.sections} siteConfig={homepage.config} />
    </div>
  );
}

