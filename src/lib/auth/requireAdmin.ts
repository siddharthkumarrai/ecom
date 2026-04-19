import { auth } from "@clerk/nextjs/server";
import { getCurrentUserRole, isAdminRole } from "@/lib/auth/roles";

export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return { ok: false as const, reason: "unauthorized" as const };

  const role = await getCurrentUserRole();
  if (!isAdminRole(role)) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  return { ok: true as const, userId };
}

