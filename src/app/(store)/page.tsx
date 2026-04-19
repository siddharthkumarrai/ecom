import { SectionRenderer } from "@/components/store/sections/SectionRenderer";
import { getHomepageConfig } from "@/lib/storefront/getHomepageConfig";

export const revalidate = 60;

export default async function HomePage() {
  const homepage = await getHomepageConfig();
  return <SectionRenderer sections={homepage.sections} siteConfig={homepage.config} />;
}
