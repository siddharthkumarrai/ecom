import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { ClerkSignOutButton } from "@/components/store/shared/ClerkSignOutButton";
import { getCurrentUserRole, isAdminRole } from "@/lib/auth/roles";
import type { CSSProperties } from "react";

interface AnnouncementBarProps {
  text: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textTransform: string;
  animation: string;
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
  fontSize,
  fontWeight,
  fontStyle,
  textTransform,
  animation,
  topBarLinks,
}: AnnouncementBarProps) {
  const { userId } = await auth();
  const isSignedIn = !!userId;
  const role = await getCurrentUserRole();
  const isAdminUser = isAdminRole(role);
  const normalizedAnimation = String(animation ?? "").trim().toLowerCase();
  const normalizedFontWeight = String(fontWeight ?? "").trim();
  const normalizedFontStyle = String(fontStyle ?? "").trim().toLowerCase();
  const normalizedTextTransform = String(textTransform ?? "").trim().toLowerCase();

  const animationClass =
    normalizedAnimation === "marquee"
      ? "announcement-text-marquee"
      : normalizedAnimation === "pulse"
        ? "announcement-text-pulse"
        : normalizedAnimation === "fade"
          ? "announcement-text-fade"
          : "";
  const textStyle = {
    color: textColor,
    fontSize: `${Math.max(9, Math.min(24, Number(fontSize) || 11))}px`,
    lineHeight: 1.25,
    fontWeight: ["400", "500", "600", "700"].includes(normalizedFontWeight) ? normalizedFontWeight : "500",
    fontStyle: normalizedFontStyle === "italic" ? "italic" : "normal",
    textTransform: ["none", "uppercase", "capitalize"].includes(normalizedTextTransform) ? normalizedTextTransform : "none",
  } as CSSProperties;

  return (
    <div
      className="border-b border-zinc-200 px-[var(--content-px-mobile)] py-1 md:px-[var(--content-px-desktop)]"
      style={{ backgroundColor }}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            className={`inline-block max-w-full ${animationClass} ${normalizedAnimation === "marquee" ? "whitespace-nowrap pr-8" : "truncate"}`}
            style={textStyle}
          >
            {text}
          </div>
        </div>
        {topBarLinks.showAuthLinks ? (
          <div className="hidden items-center gap-2 text-[11px] text-zinc-600 md:flex">
            <CircleUserRound size={12} />
            <Link href={isAdminUser ? "/admin/dashboard" : "/account/dashboard"} className="text-zinc-600 hover:opacity-90">
              {topBarLinks.myAccountLabel}
            </Link>
            {isSignedIn ? (
              <>
                <span className="text-zinc-300">|</span>
                <ClerkSignOutButton label="Logout" className="text-zinc-600 hover:opacity-90" />
              </>
            ) : (
              <>
                <span className="text-zinc-300">|</span>
                <Link href="/sign-up" className="text-zinc-600 hover:opacity-90">
                  {topBarLinks.registerLabel}
                </Link>
                <span className="text-zinc-300">|</span>
                <Link href="/sign-in" className="text-zinc-600 hover:opacity-90">
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
