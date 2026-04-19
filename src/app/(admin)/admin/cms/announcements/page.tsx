"use client";

import { useEffect, useRef, useState } from "react";

type AnnouncementMessage = { text: string; link?: string; bgColor?: string; textColor?: string };

export default function AdminAnnouncementsPage() {
  const loadedRef = useRef<{ messages: AnnouncementMessage[]; scrollSpeed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState("30");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/v1/cms");
        const data = (await res.json()) as {
          config?: {
            announcement?: {
              isEnabled?: boolean;
              scrollSpeed?: number;
              messages?: AnnouncementMessage[];
            };
          };
        };
        const ann = data.config?.announcement;
        const messages = ann?.messages?.length ? ann.messages : [{ text: "" }];
        loadedRef.current = {
          messages: messages.map((m) => ({ ...m })),
          scrollSpeed: ann?.scrollSpeed ?? 30,
        };
        setIsEnabled(!!ann?.isEnabled);
        setScrollSpeed(String(ann?.scrollSpeed ?? 30));
        setMessageText(messages[0]?.text ?? "");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const save = async () => {
    const speed = Number(scrollSpeed);
    if (!Number.isFinite(speed) || speed < 1 || speed > 200) {
      setStatus("Scroll speed must be between 1 and 200.");
      return;
    }

    let messages: AnnouncementMessage[];
    const trimmed = messageText.trim();
    if (isEnabled && !trimmed) {
      setStatus("Enter announcement text while the bar is enabled, or disable it.");
      return;
    }

    if (trimmed) {
      const base = loadedRef.current?.messages?.[0] ?? { text: trimmed };
      messages = [{ ...base, text: trimmed }, ...(loadedRef.current?.messages.slice(1) ?? []).filter((m) => m.text?.trim())];
    } else {
      messages = loadedRef.current?.messages?.length
        ? loadedRef.current.messages.map((m) => ({ ...m, text: m.text?.trim() || "—" }))
        : [{ text: "—" }];
    }

    messages = messages.filter((m) => (m.text ?? "").trim().length > 0);
    if (messages.length === 0) messages = [{ text: "—" }];

    setSaving(true);
    setStatus("Saving...");
    try {
      const res = await fetch("/api/v1/cms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcement: {
            isEnabled,
            scrollSpeed: speed,
            messages,
          },
        }),
      });
      setStatus(res.ok ? "Saved." : "Save failed.");
      if (res.ok) {
        loadedRef.current = { messages: messages.map((m) => ({ ...m })), scrollSpeed: speed };
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">Control the storefront announcement bar (top strip). Theme colors and layout stay as configured in the database.</p>
      </div>
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Announcement bar enabled
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Announcement message</span>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="e.g. Free shipping above Rs 500"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Scroll speed (1–200)</span>
          <input
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={scrollSpeed}
            onChange={(e) => setScrollSpeed(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <div>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void save()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
    </section>
  );
}
