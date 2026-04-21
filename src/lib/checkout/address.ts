export type CheckoutAddressLike = {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export function normalizeCheckoutAddress(address?: CheckoutAddressLike | null) {
  return {
    name: String(address?.name ?? "").trim(),
    phone: String(address?.phone ?? "").trim(),
    line1: String(address?.line1 ?? "").trim(),
    line2: String(address?.line2 ?? "").trim(),
    city: String(address?.city ?? "").trim(),
    state: String(address?.state ?? "").trim(),
    pincode: String(address?.pincode ?? "").trim(),
    country: String(address?.country ?? "India").trim() || "India",
  };
}

export function isCheckoutAddressComplete(address?: CheckoutAddressLike | null) {
  const normalized = normalizeCheckoutAddress(address);
  return Boolean(
    normalized.name &&
      normalized.phone &&
      normalized.line1 &&
      normalized.city &&
      normalized.state &&
      normalized.pincode
  );
}

