import { cn } from "@/lib/utils";

type AnimatedCartButtonProps = {
  ariaLabel: string;
  className?: string;
  iconClassName?: string;
};

export function AnimatedCartButton({ ariaLabel, className, iconClassName }: AnimatedCartButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "cart-btn inline-flex h-7 w-14 items-center justify-center rounded-full align-middle lg:h-8 lg:w-16",
        className,
      )}
    >
      <svg viewBox="0 0 128 56" aria-hidden="true" className={cn("h-[15px] w-[34px] lg:h-[17px] lg:w-[39px]", iconClassName)}>
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

