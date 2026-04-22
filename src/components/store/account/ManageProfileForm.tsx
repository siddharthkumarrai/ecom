"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ProfileLabels = {
  yourNameLabel: string;
  yourNamePlaceholder: string;
  yourPhoneLabel: string;
  yourPhonePlaceholder: string;
  photoLabel: string;
  salesCodeLabel: string;
  salesCodePlaceholder: string;
  yourPasswordLabel: string;
  yourPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  updateProfileButtonLabel: string;
};

export function ManageProfileForm({
  labels,
  initialName,
  initialPhone,
  initialSalesCode,
  initialProfileImageUrl,
}: {
  labels: ProfileLabels;
  initialName: string;
  initialPhone: string;
  initialSalesCode: string;
  initialProfileImageUrl: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [salesCode, setSalesCode] = useState(initialSalesCode);
  const [profileImageUrl, setProfileImageUrl] = useState(initialProfileImageUrl);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageLoadError, setImageLoadError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const avatarFallbackLabel = (name.trim().charAt(0).toUpperCase() || "C");

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setImageLoadError(false);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if ((password || confirmPassword) && password !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setSaving(true);
    try {
      let nextProfileImageUrl = profileImageUrl;
      if (photoFile) {
        const uploadData = new FormData();
        uploadData.append("file", photoFile);
        const uploadRes = await fetch("/api/v1/account/profile/avatar", {
          method: "POST",
          body: uploadData,
          credentials: "include",
        });
        const uploadBody = (await uploadRes.json().catch(() => ({}))) as { error?: string; imageUrl?: string };
        if (!uploadRes.ok || !uploadBody.imageUrl) {
          setError(uploadBody.error || "Failed to upload profile image.");
          return;
        }
        nextProfileImageUrl = uploadBody.imageUrl;
      }

      const res = await fetch("/api/v1/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          phone: phone.trim(),
          salesCode: salesCode.trim(),
          profileImageUrl: nextProfileImageUrl,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Failed to update profile.");
        return;
      }

      setStatus("Profile updated.");
      setProfileImageUrl(nextProfileImageUrl);
      setPhotoFile(null);
      setImageLoadError(false);
      setPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
        <label className="text-sm text-zinc-600">{labels.yourNameLabel}</label>
        <input
          className="h-9 w-full rounded border border-zinc-300 px-3 text-sm"
          placeholder={labels.yourNamePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="text-sm text-zinc-600">{labels.yourPhoneLabel}</label>
        <input
          className="h-9 w-full rounded border border-zinc-300 px-3 text-sm"
          placeholder={labels.yourPhonePlaceholder}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <label className="text-sm text-zinc-600">{labels.photoLabel}</label>
        <div className="space-y-2">
          <div className="relative h-14 w-14 overflow-hidden rounded-full bg-zinc-200">
            <span className="absolute inset-0 flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-600">
              {avatarFallbackLabel}
            </span>
            {previewUrl || (profileImageUrl && !imageLoadError) ? (
              <img
                src={previewUrl || profileImageUrl}
                alt="Profile"
                className="relative z-10 h-full w-full object-cover"
                onError={() => setImageLoadError(true)}
              />
            ) : null}
          </div>
          <input
            className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm"
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <label className="text-sm text-zinc-600">{labels.salesCodeLabel}</label>
        <input
          className="h-9 w-full rounded border border-zinc-300 px-3 text-sm"
          placeholder={labels.salesCodePlaceholder}
          value={salesCode}
          onChange={(e) => setSalesCode(e.target.value)}
        />
        <label className="text-sm text-zinc-600">{labels.yourPasswordLabel}</label>
        <input
          className="h-9 w-full rounded border border-zinc-300 px-3 text-sm"
          placeholder={labels.yourPasswordPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
        <label className="text-sm text-zinc-600">{labels.confirmPasswordLabel}</label>
        <input
          className="h-9 w-full rounded border border-zinc-300 px-3 text-sm"
          placeholder={labels.confirmPasswordPlaceholder}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
        />
      </div>
      <div className="mt-4 flex justify-stretch sm:justify-end">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-brand-yellow px-4 py-2 text-sm font-semibold disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Updating..." : labels.updateProfileButtonLabel}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      {status ? <p className="mt-2 text-sm text-emerald-700">{status}</p> : null}
    </form>
  );
}

