type ClaimsBag = Record<string, unknown> | null | undefined;

function readRole(container: unknown) {
  if (!container || typeof container !== "object") return "";
  const maybeRole = (container as { role?: unknown }).role;
  return typeof maybeRole === "string" ? maybeRole : "";
}

export function getRoleFromSessionClaims(sessionClaims: unknown) {
  const claims = sessionClaims as ClaimsBag;
  if (!claims) return "";
  return (
    readRole(claims["metadata"]) ||
    readRole(claims["public_metadata"]) ||
    readRole(claims["private_metadata"]) ||
    readRole(claims["unsafe_metadata"]) ||
    ""
  );
}

export function isAdminRole(role: string) {
  return role === "admin" || role === "super_admin";
}

export async function getCurrentUserRole() {
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { sessionClaims } = await auth();
  const claimRole = getRoleFromSessionClaims(sessionClaims);
  if (claimRole) return claimRole;

  const user = await currentUser();
  const publicRole = (user?.publicMetadata as { role?: unknown } | undefined)?.role;
  return typeof publicRole === "string" ? publicRole : "";
}

