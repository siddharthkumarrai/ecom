"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";

export function AuthControls() {
  const { isSignedIn } = useAuth();

  return (
    <div className="flex items-center gap-2">
      {!isSignedIn ? (
        <Link href="/sign-in" className="text-[12px] text-zinc-800 hover:text-black">
          My Account
        </Link>
      ) : null}
      {isSignedIn ? (
        <>
          <Link href="/account/dashboard" className="text-[12px] text-zinc-800 hover:text-black">
            My Account
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-7 w-7",
              },
            }}
          />
        </>
      ) : null}
    </div>
  );
}

