import Image from "next/image";
import Link from "next/link";
import type { SectionRenderProps } from "@/components/store/sections/registry";

export function BrandBannerSection({ section }: SectionRenderProps) {
  const subtitle = String(section.config.subtitle || "");
  const href = String(section.config.href || "/");
  const desktopImageUrl = String(section.config.desktopImageUrl || section.config.imageUrl || "/hero-placeholder.svg");
  const mobileImageUrl = String(section.config.mobileImageUrl || desktopImageUrl);
  const altText = String(section.config.title || subtitle || "Promo banner");

  return (
    <Link href={href} className="relative block h-[84px] overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 sm:h-[92px] lg:h-[120px]">
      <div className="relative h-full w-full lg:hidden">
        <Image src={mobileImageUrl} alt={altText} fill sizes="100vw" className="object-cover object-center" />
      </div>
      <div className="relative hidden h-full w-full lg:block">
        <Image src={desktopImageUrl} alt={altText} fill sizes="(max-width: 1280px) 100vw, 1200px" className="object-cover object-center" />
      </div>
    </Link>
  );
}
