"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/cms/homepage", label: "Homepage" },
  { href: "/admin/cms/announcements", label: "Announcements" },
  { href: "/admin/shipping", label: "Delivery Charges" },
  { href: "/admin/tracking", label: "Tracking" },
  { href: "/admin/payments", label: "Payments" },
];

const HOME_EDITOR_PATH = "/admin/cms/homepage";

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  const isHomeEditor = normalizedPath === HOME_EDITOR_PATH;

  if (isHomeEditor) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-100 [color-scheme:light] text-zinc-900">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 shadow-sm md:px-4">
          <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100" asChild>
            <Link href="/admin/dashboard" className="gap-1.5">
              <ArrowLeft className="size-4 shrink-0" />
              <span className="hidden sm:inline">Back to dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
          <span className="text-sm font-semibold text-slate-800">Homepage editor</span>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-3 md:p-4">{children}</div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-slate-100 text-zinc-900 [color-scheme:light] md:grid-cols-[260px_1fr]">
      <aside className="bg-[#0F172A] px-4 py-5 text-slate-100">
        <h2 className="text-xl font-bold tracking-wide">Admin CMS</h2>
        <nav className="mt-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + Add Product
            </Link>
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={16} />
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Admin <ChevronDown size={14} />
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
