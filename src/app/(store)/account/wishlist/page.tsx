import Link from "next/link";
import Image from "next/image";
import { getSiteConfigOrMock } from "@/lib/store/data";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User.model";
import { WishlistHeartButton } from "@/components/store/wishlist/WishlistHeartButton";

export default async function WishlistPage() {
  const [{ config }, { user }] = await Promise.all([getSiteConfigOrMock(), requireUser()]);
  let items: Array<{ id: string; slug: string; name: string; image: string; price: number }> = [];

  if (user?._id) {
    await connectDB();
    const dbUser = await User.findById(user._id)
      .populate({
        path: "wishlist",
        select: "name slug images basePrice salePrice isOnSale isActive",
        match: { isActive: true },
      })
      .select("wishlist")
      .lean<{ wishlist?: Array<{ _id: unknown; name?: string; slug?: string; images?: string[]; basePrice?: number; salePrice?: number; isOnSale?: boolean }> } | null>();

    items = (dbUser?.wishlist ?? []).map((item) => ({
      id: String(item._id),
      slug: item.slug ?? "",
      name: item.name ?? "",
      image: item.images?.[0] ?? "",
      price: item.isOnSale && typeof item.salePrice === "number" ? item.salePrice : item.basePrice ?? 0,
    }));
  }

  return (
    <main className="rounded border border-zinc-200 bg-white p-4">
      <h1 className="text-[44px] font-semibold leading-none">{config.account.wishlist.heading}</h1>
      <div className="mt-4 rounded border border-zinc-200 p-6">
        {items.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <article key={item.id} className="relative rounded border border-zinc-200 p-3">
                <div className="absolute right-2 top-2">
                  <WishlistHeartButton productId={item.id} initialInWishlist />
                </div>
                <Link href={`/products/${item.slug}`} className="block">
                  <div className="relative h-40 w-full rounded bg-zinc-50">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-contain p-2"
                        sizes="280px"
                        priority={index === 0}
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-800">{item.name}</p>
                  <p className="text-sm font-bold text-zinc-900">₹ {item.price}</p>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <>
            <div className="mx-auto h-72 w-72 rounded-full bg-[#cfe0f8]" />
            <p className="mt-4 text-center text-zinc-500">{config.account.wishlist.emptyText}</p>
          </>
        )}
      </div>
    </main>
  );
}
