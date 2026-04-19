import Link from "next/link";
import { getSiteConfigOrMock } from "@/lib/store/data";
import { requireUser } from "@/lib/auth/requireUser";
import { ClerkSignOutButton } from "@/components/store/shared/ClerkSignOutButton";

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
    <aside className="rounded border border-zinc-200 bg-white p-4">
      <div className="mx-auto h-20 w-20 rounded-full bg-zinc-200" />
      <p className="mt-3 text-center text-[24px] font-semibold leading-none">{user?.name || "Customer"}</p>
      <p className="text-center text-xs text-zinc-500">{user?.email || clerkUserId || "user"}</p>
      <nav className="mt-4 border-t border-zinc-100 pt-4 space-y-2 text-sm">
        {accountLinks.map((link) => (
          <Link key={link.href} href={link.href} className="block rounded px-2 py-1.5 text-zinc-600 hover:bg-zinc-100">
            {link.label}
          </Link>
        ))}
      </nav>
      <ClerkSignOutButton
        label={config.account.sidebar.signOutLabel}
        className="mt-5 w-full rounded-full bg-brand-yellow py-2 text-sm font-semibold"
      />
    </aside>
  );
}

