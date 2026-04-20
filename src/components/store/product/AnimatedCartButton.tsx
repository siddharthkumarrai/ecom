"use client";

import { useRouter } from "next/navigation";
import { type MouseEvent, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AnimatedCartButtonProps = {
  ariaLabel: string;
  productId?: string;
  quantity?: number;
  className?: string;
  iconClassName?: string;
  onClick?: () => void | Promise<void>;
};

export function AnimatedCartButton({
  ariaLabel,
  productId,
  quantity = 1,
  className,
  iconClassName,
  onClick,
}: AnimatedCartButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    if (onClick) {
      await onClick();
      return;
    }
    if (!productId) return;

    setBusy(true);
    try {
      const res = await fetch("/api/v1/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        toast.error("Please sign in to add products to cart.");
        router.push("/sign-in");
        return;
      }
      if (!res.ok) {
        toast.error(body.error || "Failed to add product to cart.");
        return;
      }
      if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated"));
      toast.success("Product added to cart successfully.");
    } catch {
      toast.error("Failed to add product to cart.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "cart-btn inline-flex h-8 w-16 items-center justify-center rounded-full align-middle transition-opacity lg:h-10 lg:w-20",
        busy && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <svg viewBox="0 0 128 56" aria-hidden="true" className={cn("h-[17px] w-[40px] lg:h-[22px] lg:w-[52px]", iconClassName)}>
        <rect className="cart-btn-bg" x="0" y="0" width="128" height="56" rx="28" />
        <g className="cart-btn-cg" style={{ transformOrigin: "64px 28px" }}>
          <path className="cart-btn-path" d="M36 18 L40 18 L45 32 L83 32 L88 18 L92 18" />
          <path className="cart-btn-path" d="M45 32 L43 38 L85 38 L83 32" />
          <circle className="cart-btn-dot" cx="48" cy="44" r="3" />
          <circle className="cart-btn-dot" cx="80" cy="44" r="3" />
        </g>
      </svg>
    </button>
  );
}

