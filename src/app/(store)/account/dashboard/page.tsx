import { getSiteConfigOrMock } from "@/lib/store/data";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { Cart } from "@/lib/db/models/Cart.model";
import { User } from "@/lib/db/models/User.model";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardPage() {
  const [{ config }, { user }] = await Promise.all([getSiteConfigOrMock(), requireUser()]);
  let totalExpenditure = 0;
  let cartCount = 0;
  let wishlistCount = 0;
  let orderedCount = 0;
  let shippingAddress = "";
  let wishlistItems: Array<{ id: string; slug: string; name: string; image: string; price: number }> = [];

  if (user?._id) {
    await connectDB();
    const [orders, cart, dbUser] = await Promise.all([
      Order.find({ user: user._id }).select("totalAmount items").lean(),
      Cart.findOne({ user: user._id }).select("items").lean(),
      User.findById(user._id)
        .populate({
          path: "wishlist",
          select: "name slug images basePrice salePrice isOnSale isActive",
          match: { isActive: true },
        })
        .select("addresses wishlist")
        .lean<{ addresses?: Array<{ name?: string; line1?: string; city?: string; pincode?: string; isDefault?: boolean }>; wishlist?: Array<{ _id: unknown; slug?: string; name?: string; images?: string[]; basePrice?: number; salePrice?: number; isOnSale?: boolean }> } | null>(),
    ]);

    totalExpenditure = orders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
    orderedCount = orders.reduce((sum, order) => sum + ((order.items ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0)), 0);
    cartCount = (cart?.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    wishlistItems = (dbUser?.wishlist ?? [])
      .map((item) => ({
        id: String(item._id),
        slug: String(item.slug ?? "").trim(),
        name: String(item.name ?? "").trim(),
        image: String(item.images?.[0] ?? "").trim(),
        price: item.isOnSale && typeof item.salePrice === "number" ? item.salePrice : item.basePrice ?? 0,
      }))
      .filter((item) => item.id && item.slug && item.name);
    wishlistCount = wishlistItems.length;
    const defaultAddress = dbUser?.addresses?.find((a) => a.isDefault) ?? dbUser?.addresses?.[0];
    if (defaultAddress) {
      shippingAddress = [defaultAddress.name, defaultAddress.line1, defaultAddress.city, defaultAddress.pincode].filter(Boolean).join(", ");
    }
  }

  return (
    <main className="space-y-4 rounded border border-zinc-200 bg-white p-3 sm:p-4">
      <h1 className="text-[32px] font-semibold leading-none sm:text-[44px]">{config.account.sidebar.dashboardLabel}</h1>

      <section className="rounded bg-brand-yellow p-4 sm:p-5">
        <p className="text-sm text-zinc-700">{config.account.dashboard.totalExpenditureLabel}</p>
        <p className="mt-1 text-2xl font-semibold sm:text-3xl">₹ {totalExpenditure.toFixed(2)}</p>
        <Link href="/account/orders" className="mt-2 inline-flex text-sm font-medium text-zinc-700 underline-offset-2 hover:underline">
          {config.account.dashboard.viewOrderHistoryLabel}
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded border border-zinc-200 p-4">
          <p className="text-2xl font-semibold text-zinc-900">{cartCount}</p>
          <p className="mt-1 text-sm text-zinc-600">{config.account.dashboard.productsInCartLabel}</p>
        </article>
        <article className="rounded border border-zinc-200 p-4">
          <p className="text-2xl font-semibold text-zinc-900">{wishlistCount}</p>
          <p className="mt-1 text-sm text-zinc-600">{config.account.dashboard.productsInWishlistLabel}</p>
        </article>
        <article className="rounded border border-zinc-200 p-4">
          <p className="text-2xl font-semibold text-zinc-900">{orderedCount}</p>
          <p className="mt-1 text-sm text-zinc-600">{config.account.dashboard.totalProductsOrderedLabel}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-sm font-semibold">{config.account.dashboard.defaultShippingAddressLabel}</p>
          <p className="mt-2 break-words text-xs text-zinc-600">{shippingAddress || "No address added yet."}</p>
          <Link href="/account/profile" className="mt-3 inline-flex rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold text-white">
            {config.account.dashboard.addNewAddressLabel}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <Link href="/account/orders" className="rounded border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
            {config.account.sidebar.ordersLabel}
          </Link>
          <Link href="/account/wishlist" className="rounded border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
            {config.account.sidebar.wishlistLabel}
          </Link>
          <Link href="/account/profile" className="rounded border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
            {config.account.sidebar.profileLabel}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{config.account.dashboard.wishlistHeading}</h2>
        <div className="mt-3 rounded border border-zinc-200 p-4 sm:p-6">
          {wishlistItems.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {wishlistItems.slice(0, 6).map((item) => (
                  <Link key={item.id} href={`/products/${item.slug}`} className="rounded border border-zinc-200 p-3 hover:bg-zinc-50">
                    <div className="relative h-28 w-full rounded bg-zinc-50">
                      {item.image ? <Image src={item.image} alt={item.name} fill className="object-contain p-2" sizes="220px" /> : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-800">{item.name}</p>
                    <p className="text-sm font-bold text-zinc-900">₹ {item.price}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-4">
                <Link href="/account/wishlist" className="inline-flex rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold text-white">
                  {config.account.sidebar.wishlistLabel}
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto h-44 w-44 rounded-full bg-[#cfe0f8] sm:h-56 sm:w-56 md:h-64 md:w-64" />
              <p className="mt-4 text-center text-zinc-500">{config.account.dashboard.wishlistEmptyText}</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
