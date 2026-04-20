"use client";

import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/lib/store/types";
import { AllCategoryMenu } from "@/components/store/layout/AllCategoryMenu";
import { SuperDealsMenu } from "@/components/store/layout/SuperDealsMenu";
import { GitCompareArrows, Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/lib/store/types";
import { getCompareProductIds } from "@/components/store/compare/compare-storage";
import { ClerkSignOutButton } from "@/components/store/shared/ClerkSignOutButton";

interface HeaderProps {
  supportPhone: string;
  categories: Category[];
  products: Product[];
  appearance: {
    navbarBg: string;
    navbarText: string;
    navbarIconColor: string;
  };
  navActions: {
    showCompare: boolean;
    showWishlist: boolean;
    showCart: boolean;
    cartLabel: string;
  };
  topBarLinks: {
    myAccountLabel: string;
    registerLabel: string;
    loginLabel: string;
    showAuthLinks: boolean;
  };
  allCategoryLabel: string;
  branding: {
    storeName: string;
    logoUrl: string;
  };
  allCategoriesMenuLabels: {
    viewAllBrandsLabel: string;
    viewAllCategoriesLabel: string;
  };
  searchPlaceholder: string;
  searchCategoryLabel: string;
  superDealsLabel: string;
  customerCareLabel: string;
  topNavCategoryLimit: number;
}

export function Header({
  supportPhone,
  categories,
  products,
  appearance,
  navActions,
  topBarLinks,
  allCategoryLabel,
  branding,
  allCategoriesMenuLabels,
  searchPlaceholder,
  searchCategoryLabel,
  superDealsLabel,
  customerCareLabel,
  topNavCategoryLimit,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [compareCount, setCompareCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [query, setQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const safeTopNavCategoryLimit = Number.isFinite(topNavCategoryLimit) ? topNavCategoryLimit : 6;
  const visibleCategoryLimit = Math.max(0, safeTopNavCategoryLimit);
  const navCategories = visibleCategoryLimit > 0 ? categories.slice(0, visibleCategoryLimit) : categories;
  const resolvedStoreName = String(branding.storeName || "").trim() || "lumenskart";
  const resolvedLogoUrl = String(branding.logoUrl || "").trim();
  const hasBrandLogo = Boolean(resolvedLogoUrl);
  const categoryExists = (slug: string) => slug === "all" || categories.some((category) => category.slug === slug);

  useEffect(() => {
    const loadSummary = async () => {
      const res = await fetch("/api/v1/account/summary", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        wishlistCount?: number;
        cartCount?: number;
        isAuthenticated?: boolean;
      };
      setWishlistCount(data.wishlistCount ?? 0);
      setCartCount(data.cartCount ?? 0);
      setIsAuthenticated(data.isAuthenticated ?? false);
    };
    const loadCompareCount = () => {
      setCompareCount(getCompareProductIds().length);
    };
    void loadSummary();
    loadCompareCount();
    const refresh = () => void loadSummary();
    const refreshCompare = () => loadCompareCount();
    window.addEventListener("wishlist-updated", refresh);
    window.addEventListener("cart-updated", refresh);
    window.addEventListener("compare-updated", refreshCompare);
    window.addEventListener("storage", refreshCompare);
    window.addEventListener("focus", refresh);
    window.addEventListener("focus", refreshCompare);
    return () => {
      window.removeEventListener("wishlist-updated", refresh);
      window.removeEventListener("cart-updated", refresh);
      window.removeEventListener("compare-updated", refreshCompare);
      window.removeEventListener("storage", refreshCompare);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("focus", refreshCompare);
    };
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/search")) return;
    const nextQuery = (searchParams?.get("q") ?? "").trim();
    const nextCategoryRaw = (searchParams?.get("category") ?? "all").trim();
    const nextCategory = categoryExists(nextCategoryRaw) ? nextCategoryRaw : "all";
    setQuery(nextQuery);
    setSearchCategory(nextCategory);
  }, [pathname, searchParams, categories]);

  const runSearch = () => {
    const normalizedQuery = query.trim();
    const normalizedCategory = searchCategory.trim();
    const params = new URLSearchParams();
    if (normalizedQuery) params.set("q", normalizedQuery);
    if (normalizedCategory && normalizedCategory !== "all") params.set("category", normalizedCategory);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <header className="border-b border-zinc-200">
      <div style={{ backgroundColor: appearance.navbarBg }}>
        <div className="flex w-full min-w-0 items-center gap-2 px-[var(--content-px-mobile)] py-2 md:gap-4 md:px-[var(--content-px-desktop)] md:py-2.5">
          <button
            className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded text-zinc-700 md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            <Menu size={16} />
          </button>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 pr-1 text-[18px] font-bold italic leading-none sm:text-[22px] md:text-[40px]"
            style={{ color: appearance.navbarText }}
          >
            {hasBrandLogo ? (
              <span className="relative block h-10 w-36 md:h-12 md:w-44">
                <Image src={resolvedLogoUrl} alt={resolvedStoreName} fill className="object-contain object-left" sizes="176px" />
              </span>
            ) : (
              resolvedStoreName
            )}
          </Link>
          <button
            type="button"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-900 hover:bg-black/10 md:inline-flex"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={18} strokeWidth={2.2} />
          </button>
          <div className="hidden min-w-0 flex-1 items-center md:flex">
            <form
              className="flex h-10 w-full overflow-hidden rounded-full border border-zinc-900/10 bg-white shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                runSearch();
              }}
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent px-5 text-sm outline-none"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
              <select
                value={searchCategory}
                onChange={(event) => setSearchCategory(event.target.value)}
                className="border-l border-zinc-200 bg-white px-3 text-[13px] text-zinc-600 outline-none"
                aria-label={searchCategoryLabel}
              >
                <option value="all">{searchCategoryLabel}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                aria-label="Search products"
                className="inline-flex w-12 items-center justify-center bg-zinc-800 text-white"
              >
                <Search size={17} />
              </button>
            </form>
          </div>
          <button
            className="ml-auto inline-flex h-8 w-8 items-center justify-center text-zinc-800 md:hidden"
            aria-label="Search"
            onClick={runSearch}
          >
            <Search size={18} />
          </button>
          {navActions.showCompare ? (
            <Link href="/compare" className="relative hidden hover:opacity-90 md:inline-flex" aria-label="Compare" style={{ color: appearance.navbarIconColor }}>
              <GitCompareArrows size={16} />
              <span className="absolute -right-2 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-zinc-800 px-1 text-[10px] font-bold text-white">
                {compareCount}
              </span>
            </Link>
          ) : null}
          {navActions.showWishlist ? (
            <Link href="/account/wishlist" className="relative hidden hover:opacity-90 md:inline-flex" aria-label="Favourite" style={{ color: appearance.navbarIconColor }}>
              <Heart size={16} />
              <span className="absolute -right-2 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            </Link>
          ) : null}
          {navActions.showCart ? (
            <Link href="/cart" className="inline-flex shrink-0 items-center gap-1.5 hover:opacity-90 md:ml-0" style={{ color: appearance.navbarIconColor }}>
              <span className="relative inline-flex h-8 w-8 items-center justify-center">
                <ShoppingBag size={16} />
                <span className="absolute -right-2 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              </span>
              <span className="text-[12px] font-semibold leading-none">{navActions.cartLabel || "₹0"}</span>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="hidden w-full items-center justify-between border-t border-zinc-200 bg-white px-[var(--content-px-mobile)] py-2 md:flex md:px-[var(--content-px-desktop)]">
        <nav className="flex items-center gap-5 text-[12px] font-medium">
          <AllCategoryMenu
            categories={categories}
            products={products}
            label={allCategoryLabel}
            viewAllBrandsLabel={allCategoriesMenuLabels.viewAllBrandsLabel}
            viewAllCategoriesLabel={allCategoriesMenuLabels.viewAllCategoriesLabel}
          />
          <SuperDealsMenu
            products={products}
            label={superDealsLabel}
          />
          {navCategories.map((category) => (
            <Link key={category.id} href={`/category/${category.slug}`} className="whitespace-nowrap text-zinc-700 hover:text-black">
              {category.name}
            </Link>
          ))}
        </nav>
        <div className="hidden text-[12px] font-semibold text-zinc-700 md:block">
          {customerCareLabel ? `${customerCareLabel} : ${supportPhone}` : supportPhone}
        </div>
      </div>
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/35"
            aria-label="Close menu overlay"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative h-full w-[82vw] max-w-[320px] overflow-y-auto border-r border-zinc-200 bg-white md:w-[340px] md:max-w-[340px]">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <Link
                href="/"
                className="text-[34px] font-bold italic leading-none text-zinc-900"
                onClick={() => setMobileNavOpen(false)}
              >
                {hasBrandLogo ? (
                  <span className="relative block h-10 w-36">
                    <Image src={resolvedLogoUrl} alt={resolvedStoreName} fill className="object-contain object-left" sizes="144px" />
                  </span>
                ) : (
                  resolvedStoreName
                )}
              </Link>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1 p-4 text-[14px]">
              <Link href="/" className="block rounded px-2 py-2 text-zinc-700 hover:bg-zinc-100" onClick={() => setMobileNavOpen(false)}>
                Home
              </Link>
              <Link href="/category/all" className="block rounded px-2 py-2 text-zinc-700 hover:bg-zinc-100" onClick={() => setMobileNavOpen(false)}>
                Shop
              </Link>
              <Link href="/brands" className="block rounded px-2 py-2 text-zinc-700 hover:bg-zinc-100" onClick={() => setMobileNavOpen(false)}>
                Brands
              </Link>
              <Link href="/contact" className="block rounded px-2 py-2 text-zinc-700 hover:bg-zinc-100" onClick={() => setMobileNavOpen(false)}>
                Contact Us
              </Link>
              <Link href="/about" className="block rounded px-2 py-2 text-zinc-700 hover:bg-zinc-100" onClick={() => setMobileNavOpen(false)}>
                About us
              </Link>

              {topBarLinks.showAuthLinks ? (
                <>
                  <div className="my-2 border-t border-zinc-200" />
                  <div className="grid grid-cols-2 gap-2 px-2 py-2 text-[13px]">
                    {isAuthenticated ? (
                      <>
                        <Link
                          href="/account/dashboard"
                          className="inline-flex items-center justify-center rounded border border-zinc-200 px-2 py-2 font-medium text-zinc-700 hover:bg-zinc-100"
                          onClick={() => setMobileNavOpen(false)}
                        >
                          {topBarLinks.myAccountLabel || "My Account"}
                        </Link>
                        <ClerkSignOutButton
                          label="Logout"
                          className="inline-flex items-center justify-center rounded border border-zinc-200 px-2 py-2 font-medium text-zinc-700 hover:bg-zinc-100"
                        />
                      </>
                    ) : (
                      <>
                        <Link
                          href="/sign-up"
                          className="inline-flex items-center justify-center rounded border border-zinc-200 px-2 py-2 font-medium text-zinc-700 hover:bg-zinc-100"
                          onClick={() => setMobileNavOpen(false)}
                        >
                          {topBarLinks.registerLabel || "Register"}
                        </Link>
                        <Link
                          href="/sign-in"
                          className="inline-flex items-center justify-center rounded bg-zinc-900 px-2 py-2 font-medium text-white hover:bg-zinc-800"
                          onClick={() => setMobileNavOpen(false)}
                        >
                          {topBarLinks.loginLabel || "Login"}
                        </Link>
                      </>
                    )}
                  </div>
                </>
              ) : null}

              <div className="my-2 border-t border-zinc-200" />
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Categories</p>
              {categories.slice(0, 10).map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="block rounded px-2 py-2 text-zinc-700 hover:bg-zinc-100"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {category.name}
                </Link>
              ))}

              <div className="my-2 border-t border-zinc-200" />
              <div className="flex items-center gap-4 px-2 py-2 text-[13px]">
                {navActions.showCompare ? (
                  <Link href="/compare" className="inline-flex items-center gap-1 text-zinc-700" aria-label="Compare" onClick={() => setMobileNavOpen(false)}>
                    <GitCompareArrows size={15} /> Compare ({compareCount})
                  </Link>
                ) : null}
                {navActions.showWishlist ? (
                  <Link href="/account/wishlist" className="inline-flex items-center gap-1 text-zinc-700" aria-label="Wishlist" onClick={() => setMobileNavOpen(false)}>
                    <Heart size={15} /> Wishlist ({wishlistCount})
                  </Link>
                ) : null}
              </div>
              <div className="px-2 pt-1 text-[11px] text-zinc-600">
                {customerCareLabel ? `${customerCareLabel}: ${supportPhone}` : supportPhone}
              </div>
            </nav>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
