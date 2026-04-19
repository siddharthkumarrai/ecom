import { AccountSidebar } from "@/components/store/shared/AccountSidebar";
import { PostContentSections } from "@/components/store/shared/PostContentSections";
import { getCurrentUserRole, isAdminRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isCmsStorePreview = cookieStore.get("cms_store_preview")?.value === "1";
  const role = await getCurrentUserRole();
  if (isAdminRole(role) && !isCmsStorePreview) redirect("/admin/dashboard");

  return (
    <>
      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <AccountSidebar />
        <div>{children}</div>
      </div>
      <PostContentSections />
    </>
  );
}

