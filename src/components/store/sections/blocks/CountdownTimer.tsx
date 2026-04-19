"use client";

import { useEffect, useState } from "react";

function getParts(targetIso?: string) {
  const target = targetIso ? new Date(targetIso).getTime() : Number.NaN;
  if (!Number.isFinite(target)) {
    return { hours: "--", mins: "--", secs: "--" };
  }

  const diff = Math.max(target - Date.now(), 0);
  const sec = Math.floor(diff / 1000);
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  return {
    hours: String(hours).padStart(2, "0"),
    mins: String(mins).padStart(2, "0"),
    secs: String(secs).padStart(2, "0"),
  };
}

export function CountdownTimer({ endsAt }: { endsAt?: string }) {
  const [parts, setParts] = useState<{ hours: string; mins: string; secs: string } | null>(null);

  useEffect(() => {
    setParts(getParts(endsAt));
    const id = window.setInterval(() => setParts(getParts(endsAt)), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const safe = parts ?? { hours: "--", mins: "--", secs: "--" };
  const blocks = [
    { label: "HH", value: safe.hours },
    { label: "MIN", value: safe.mins },
    { label: "SEC", value: safe.secs },
  ];

  return (
    <div className="flex gap-2">
      {blocks.map((item) => (
        <div key={item.label} className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-center">
          <div className="text-lg font-bold">{item.value}</div>
          <div className="text-[10px] font-bold text-zinc-500">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
