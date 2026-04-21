import { AccountSidebar } from "@/components/store/shared/AccountSidebar";
import { StoreBottomSections } from "@/components/store/layout/StoreBottomSections";
import { getCurrentUserRole, isAdminRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Suspense } from "react";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isCmsStorePreview = cookieStore.get("cms_store_preview")?.value === "1";
  const role = await getCurrentUserRole();
  if (isAdminRole(role) && !isCmsStorePreview) redirect("/admin/dashboard");

  return (
    <div className="-mx-[var(--content-px-mobile)] md:mx-0">
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <AccountSidebar />
        <div className="min-w-0">{children}</div>
      </div>
      <Suspense fallback={<div className="mt-6 h-24 animate-pulse rounded-2xl border border-zinc-200 bg-white/80" />}>
        <StoreBottomSections className="mt-6" />
      </Suspense>
    </div>
  );
}
