"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AccountLink {
  href: string;
  label: string;
}

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/account/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

export function AccountSidebarNav({ links }: { links: AccountLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
      {links.map((link) => {
        const isActive = isActivePath(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`block rounded px-2 py-1.5 transition-colors ${
              isActive
                ? "bg-brand-yellow/25 font-semibold text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

