"use client";

import { useEffect, useMemo, useState } from "react";

type Address = {
  _id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pincode: string;
  country?: string;
  isDefault?: boolean;
};
const MAX_ADDRESSES = 4;

const empty = () => ({
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: false,
});

export default function AddressManager({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [form, setForm] = useState(() => empty());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  const defaultId = useMemo(() => addresses.find((a) => a.isDefault)?._id ?? "", [addresses]);
  const canAddMore = addresses.length < MAX_ADDRESSES;

  const refresh = async () => {
    const res = await fetch("/api/v1/account/addresses", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as { addresses?: Address[] };
    if (res.ok) setAddresses(body.addresses ?? []);
  };

  const addAddress = async () => {
    if (!canAddMore) {
      setError(`You can save up to ${MAX_ADDRESSES} addresses only.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: form }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; addresses?: Address[] };
      if (!res.ok) {
        setError(body.error || "Failed to add address.");
        return;
      }
      setAddresses(body.addresses ?? []);
      setForm(empty());
    } finally {
      setBusy(false);
    }
  };

  const setDefault = async (addressId: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/account/addresses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, setDefault: true }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; addresses?: Address[] };
      if (!res.ok) {
        setError(body.error || "Failed to set default.");
        return;
      }
      setAddresses(body.addresses ?? []);
    } finally {
      setBusy(false);
    }
  };

  const removeAddress = async (addressId: string) => {
    if (!confirm("Delete this address?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/account/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; addresses?: Address[] };
      if (!res.ok) {
        setError(body.error || "Failed to delete address.");
        return;
      }
      setAddresses(body.addresses ?? []);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-800">Add New Address</h3>
          <button type="button" onClick={refresh} className="text-xs font-semibold text-zinc-600 hover:text-zinc-900">
            Refresh
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Saved addresses: {addresses.length}/{MAX_ADDRESSES}
        </p>
        {!canAddMore ? <p className="mt-1 text-xs font-medium text-amber-700">Address limit reached. Delete one address to add a new one.</p> : null}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-700">Full name</span>
            <input className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-700">Phone</span>
            <input className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-zinc-700">Address line 1</span>
            <input className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm" value={form.line1} onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-zinc-700">Address line 2</span>
            <input className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm" value={form.line2} onChange={(e) => setForm((p) => ({ ...p, line2: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-700">City</span>
            <input className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-700">State</span>
            <input className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm" value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-700">Pincode</span>
            <input className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm" value={form.pincode} onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-700">Country</span>
            <input className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
          </label>
          <label className="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={!!form.isDefault || addresses.length === 0} onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))} />
            <span className="text-xs text-zinc-700">Set as default</span>
          </label>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={addAddress}
            disabled={busy || !canAddMore}
            className="rounded bg-[#f5c400] px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-[#ffd84d] disabled:opacity-60"
          >
            {busy ? "Saving..." : canAddMore ? "Save Address" : "Address limit reached"}
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {addresses.length ? (
          addresses.map((a, index) => (
            <div key={a._id || `address-${index}`} className="rounded border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{a.name}</p>
                  <p className="text-xs text-zinc-600">{a.phone}</p>
                </div>
                {a._id === defaultId ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Default</span> : null}
              </div>
              <p className="mt-2 text-xs text-zinc-700">{a.line1}</p>
              {a.line2 ? <p className="text-xs text-zinc-700">{a.line2}</p> : null}
              <p className="text-xs text-zinc-700">
                {a.city}, {a.state} {a.pincode}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDefault(a._id)}
                  disabled={busy || a._id === defaultId}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                >
                  Set Default
                </button>
                <button
                  type="button"
                  onClick={() => removeAddress(a._id)}
                  disabled={busy}
                  className="rounded border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-600 md:col-span-2">No addresses saved yet.</div>
        )}
      </div>
    </div>
  );
}
