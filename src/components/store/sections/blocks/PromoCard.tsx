import Image from "next/image";
import Link from "next/link";

type PromoCardProps = {
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
  ctaLabel?: string;
};

export function PromoCard({ title, subtitle, href, imageUrl, ctaLabel = "Shop now" }: PromoCardProps) {
  return (
    <Link
      href={href}
      className="group grid min-h-[108px] grid-cols-[92px_minmax(0,1fr)] overflow-hidden rounded border border-zinc-200 bg-[#f7f7f7]"
    >
      <div className="relative">
        <Image
          src={imageUrl || "/hero-placeholder.svg"}
          alt={title}
          fill
          sizes="92px"
          className="object-contain p-2"
        />
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-[11px] font-bold uppercase leading-4 text-zinc-900">
          {title}
        </p>
        {subtitle ? <p className="mt-1 text-[10px] text-zinc-600">{subtitle}</p> : null}
        <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-900">
          {ctaLabel}
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-brand-yellow text-[10px] leading-none text-zinc-900">›</span>
        </span>
      </div>
    </Link>
  );
}
