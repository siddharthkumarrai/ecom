import { getSiteConfigOrMock } from "@/lib/store/data";
import { requireUser } from "@/lib/auth/requireUser";
import { ClerkSignOutButton } from "@/components/store/shared/ClerkSignOutButton";
import { AccountSidebarNav } from "@/components/store/shared/AccountSidebarNav";

export async function AccountSidebar() {
  const [{ config }, { user, clerkUserId }] = await Promise.all([getSiteConfigOrMock(), requireUser()]);
  const accountLinks = [
    { href: "/account/dashboard", label: config.account.sidebar.dashboardLabel },
    { href: "/account/orders", label: config.account.sidebar.ordersLabel },
    { href: "/account/wishlist", label: config.account.sidebar.wishlistLabel },
    { href: "/account/conversations", label: config.account.sidebar.conversationsLabel },
    { href: "/account/support", label: config.account.sidebar.supportLabel },
    { href: "/account/profile", label: config.account.sidebar.profileLabel },
  ];

  return (
    <aside className="rounded border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="mx-auto h-16 w-16 rounded-full bg-zinc-200 sm:h-20 sm:w-20" />
      <p className="mt-3 line-clamp-2 break-words text-center text-xl font-semibold leading-tight sm:text-[24px]">{user?.name || "Customer"}</p>
      <p className="break-all text-center text-[11px] text-zinc-500 sm:text-xs">{user?.email || clerkUserId || "user"}</p>
      <AccountSidebarNav links={accountLinks} />
      <ClerkSignOutButton
        label={config.account.sidebar.signOutLabel}
        className="mt-5 w-full rounded-full bg-brand-yellow py-2 text-sm font-semibold"
      />
    </aside>
  );
}
