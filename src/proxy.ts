import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getRoleFromSessionClaims, isAdminRole } from "@/lib/auth/roles";

const isPublicRoute = createRouteMatcher([
  "/",
  "/access-denied",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
  "/products/(.*)",
  "/category/(.*)",
  "/brands/(.*)",
  "/api/v1/products(.*)",
  "/api/v1/cms(.*)",
]);
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/v1/admin(.*)"]);
const isProtectedRoute = createRouteMatcher(["/account(.*)", "/checkout(.*)", "/cart(.*)", "/api/v1/cart(.*)", "/api/v1/orders(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const role = getRoleFromSessionClaims(sessionClaims);
  const isAdminUser = isAdminRole(role);
  const isCmsStorePreview = req.cookies.get("cms_store_preview")?.value === "1";

  // Admin users should land in admin dashboard directly.
  if (userId && isAdminUser && !isCmsStorePreview) {
    const path = req.nextUrl.pathname;
    if (path === "/" || path.startsWith("/account")) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  if (!isPublicRoute(req) && (isProtectedRoute(req) || isAdminRoute(req)) && !userId) {
    const signInUrl = new URL("/sign-in", req.url);
    const redirectPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    signInUrl.searchParams.set("redirect_url", redirectPath);
    return NextResponse.redirect(signInUrl);
  }

  // Note: role checks are finalized server-side in admin layout/API guard.
  // This avoids false "access denied" when session claims lag behind metadata updates.
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

