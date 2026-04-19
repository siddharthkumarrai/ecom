export function RatingStars({ rating, count, size = "sm" }: { rating: number; count?: number; size?: "sm" | "md" }) {
  const normalized = Math.max(0, Math.min(5, Number.isFinite(rating) ? rating : 0));
  const rounded = Math.round(normalized);
  const starClass = size === "md" ? "text-base" : "text-xs";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5" aria-label={`Rating ${normalized.toFixed(1)} out of 5`}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <span key={idx} className={`${starClass} ${idx < rounded ? "text-amber-400" : "text-zinc-300"}`}>
            ★
          </span>
        ))}
      </div>
      <span className="text-[11px] text-zinc-500">
        {normalized.toFixed(1)}
        {typeof count === "number" ? ` (${count})` : ""}
      </span>
    </div>
  );
}
