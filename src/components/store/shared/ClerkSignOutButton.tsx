"use client";

import { useClerk } from "@clerk/nextjs";

export function ClerkSignOutButton({ label, className }: { label: string; className?: string }) {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void signOut({ redirectUrl: "/" });
      }}
    >
      {label}
    </button>
  );
}

