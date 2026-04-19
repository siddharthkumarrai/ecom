import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUserRole, isAdminRole } from "@/lib/auth/roles";
import { AdminChrome } from "./AdminChrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const role = await getCurrentUserRole();

  if (!userId) redirect("/sign-in?redirect_url=/admin/dashboard");
  if (!isAdminRole(role)) redirect("/access-denied");

  return <AdminChrome>{children}</AdminChrome>;
}

