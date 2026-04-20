import Link from "next/link";
import { cn } from "@/lib/utils";

export function NoProductsMessage({
  className,
  exploreHref = "/category/all",
}: {
  className?: string;
  exploreHref?: string;
}) {
  return (
    <div className={cn("flex min-h-[220px] flex-col items-center justify-center px-4 py-8 text-center", className)}>
      <p className="text-base font-medium text-zinc-700">No products available in this category right now.</p>
      <p className="mt-1 text-sm text-zinc-500">Please check again later or explore.</p>
      <Link
        href={exploreHref}
        className="mt-4 inline-flex rounded-full bg-brand-yellow px-5 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-[#ffd84d]"
      >
        Explore products
      </Link>
    </div>
  );
}

