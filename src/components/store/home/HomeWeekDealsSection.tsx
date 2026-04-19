"use client";

import { useEffect, useState } from "react";
import { HomeProductTile } from "@/components/store/home/HomeProductTile";
import type { Product } from "@/lib/store/types";

type CountdownPart = {
  label: string;
  value: string;
};

function getCountdownParts(endsAt: string): CountdownPart[] {
  const target = endsAt ? new Date(endsAt).getTime() : Number.NaN;
  if (!Number.isFinite(target)) {
    return [
      { label: "HOURS", value: "00" },
      { label: "MINS", value: "00" },
      { label: "SECS", value: "00" },
    ];
  }

  const diffMs = Math.max(target - Date.now(), 0);
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return [
    { label: "HOURS", value: String(hours).padStart(2, "0") },
    { label: "MINS", value: String(mins).padStart(2, "0") },
    { label: "SECS", value: String(secs).padStart(2, "0") },
  ];
}

export function HomeWeekDealsSection({
  title,
  subtitle,
  endsAt,
  products,
}: {
  title: string;
  subtitle: string;
  endsAt: string;
  products: Product[];
}) {
  const [countdownParts, setCountdownParts] = useState<CountdownPart[] | null>(() =>
    endsAt
      ? getCountdownParts(endsAt)
      : [
          { label: "HOURS", value: "--" },
          { label: "MINS", value: "--" },
          { label: "SECS", value: "--" },
        ]
  );

  useEffect(() => {
    if (!endsAt) return;
    const timer = window.setInterval(() => {
      setCountdownParts(getCountdownParts(endsAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endsAt]);

  if (!products.length) return null;

  const safeCountdownParts =
    countdownParts ??
    [
      { label: "HOURS", value: "--" },
      { label: "MINS", value: "--" },
      { label: "SECS", value: "--" },
    ];

  return (
    <section className="grid gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
      <div className="rounded-md border border-zinc-200 bg-white p-4">
        <p className="text-[17px] font-bold text-zinc-800">{title}</p>
        <div className="mt-4 flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-[#ffe27a] bg-brand-yellow text-2xl font-bold text-zinc-900 shadow-sm">
          %
        </div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">{subtitle}</p>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {safeCountdownParts.map((part) => (
            <div key={part.label} className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-2 text-center">
              <div className="text-xl font-bold text-zinc-900">{part.value}</div>
              <div className="mt-1 text-[9px] font-bold tracking-[0.16em] text-zinc-500">{part.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-zinc-200 bg-white p-2.5 md:p-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2.5 lg:grid-cols-5">
          {products.slice(0, 10).map((product) => (
            <HomeProductTile key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
