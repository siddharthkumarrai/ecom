export const DELIVERY_STATUS_VALUES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUS_VALUES)[number];

export function normalizeDeliveryStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("delivered")) return "delivered";
  if (normalized.includes("out for delivery")) return "out_for_delivery";
  if (normalized.includes("in transit") || normalized.includes("dispatched") || normalized.includes("shipped")) return "shipped";
  if (normalized.includes("pickup scheduled") || normalized.includes("pickup generated")) return "confirmed";
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("return")) return "returned";
  if (normalized.includes("process")) return "processing";
  if (normalized.includes("confirm")) return "confirmed";
  return null;
}

