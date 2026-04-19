import { getSiteConfigOrMock } from "@/lib/store/data";
import { requireUser } from "@/lib/auth/requireUser";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/lib/db/models/Order.model";
import { Cart } from "@/lib/db/models/Cart.model";
import { User } from "@/lib/db/models/User.model";

export default async function DashboardPage() {
  const [{ config }, { user }] = await Promise.all([getSiteConfigOrMock(), requireUser()]);
  let totalExpenditure = 0;
  let cartCount = 0;
  let wishlistCount = 0;
  let orderedCount = 0;
  let shippingAddress = "";

  if (user?._id) {
    await connectDB();
    const [orders, cart, dbUser] = await Promise.all([
      Order.find({ user: user._id }).select("totalAmount items").lean(),
      Cart.findOne({ user: user._id }).select("items").lean(),
      User.findById(user._id).select("addresses wishlist").lean(),
    ]);

    totalExpenditure = orders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
    orderedCount = orders.reduce((sum, order) => sum + ((order.items ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0)), 0);
    cartCount = (cart?.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    wishlistCount = (dbUser?.wishlist ?? []).length;
    const defaultAddress = dbUser?.addresses?.find((a) => a.isDefault) ?? dbUser?.addresses?.[0];
    if (defaultAddress) {
      shippingAddress = [defaultAddress.name, defaultAddress.line1, defaultAddress.city, defaultAddress.pincode].filter(Boolean).join(", ");
    }
  }

  return (
    <main className="space-y-4 rounded border border-zinc-200 bg-white p-4">
      <div className="rounded bg-brand-yellow p-5">
        <p className="text-sm text-zinc-700">{config.account.dashboard.totalExpenditureLabel}</p>
        <p className="mt-1 text-2xl font-semibold">₹ {totalExpenditure.toFixed(2)}</p>
        <p className="mt-1 text-sm text-zinc-700">{config.account.dashboard.viewOrderHistoryLabel}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded border border-zinc-200 p-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{cartCount} {config.account.dashboard.productsInCartLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{wishlistCount} {config.account.dashboard.productsInWishlistLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{orderedCount} {config.account.dashboard.totalProductsOrderedLabel}</span>
            </div>
          </div>
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-sm font-semibold">{config.account.dashboard.defaultShippingAddressLabel}</p>
          {shippingAddress ? <p className="mt-2 text-xs text-zinc-600">{shippingAddress}</p> : null}
          <button className="mt-3 rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold text-white">{config.account.dashboard.addNewAddressLabel}</button>
        </div>
      </div>

      <h2 className="text-lg font-semibold">{config.account.dashboard.wishlistHeading}</h2>
      <div className="rounded border border-zinc-200 p-6">
        <div className="mx-auto h-72 w-72 rounded-full bg-[#cfe0f8]" />
        <p className="mt-4 text-center text-zinc-500">{config.account.dashboard.wishlistEmptyText}</p>
      </div>
    </main>
  );
}

