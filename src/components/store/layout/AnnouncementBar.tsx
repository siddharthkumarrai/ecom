import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { ClerkSignOutButton } from "@/components/store/shared/ClerkSignOutButton";
import { getCurrentUserRole, isAdminRole } from "@/lib/auth/roles";

interface AnnouncementBarProps {
  text: string;
  backgroundColor: string;
  textColor: string;
  topBarLinks: {
    myAccountLabel: string;
    registerLabel: string;
    loginLabel: string;
    showAuthLinks: boolean;
  };
}

export async function AnnouncementBar({
  text,
  backgroundColor,
  textColor,
  topBarLinks,
}: AnnouncementBarProps) {
  const { userId } = await auth();
  const isSignedIn = !!userId;
  const role = await getCurrentUserRole();
  const isAdminUser = isAdminRole(role);

  return (
    <div
      className="border-b border-zinc-200 px-[var(--content-px-mobile)] py-1 text-[11px] md:px-[var(--content-px-desktop)]"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="truncate text-[11px] font-medium">{text}</div>
        {topBarLinks.showAuthLinks ? (
          <div className="hidden items-center gap-2 text-[11px] md:flex">
            <CircleUserRound size={12} />
            <Link href={isAdminUser ? "/admin/dashboard" : "/account/dashboard"} className="hover:opacity-90">
              {topBarLinks.myAccountLabel}
            </Link>
            {isSignedIn ? (
              <>
                <span className="text-zinc-300">|</span>
                <ClerkSignOutButton label="Logout" className="hover:opacity-90" />
              </>
            ) : (
              <>
                <span className="text-zinc-300">|</span>
                <Link href="/sign-up" className="hover:opacity-90">
                  {topBarLinks.registerLabel}
                </Link>
                <span className="text-zinc-300">|</span>
                <Link href="/sign-in" className="hover:opacity-90">
                  {topBarLinks.loginLabel}
                </Link>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
