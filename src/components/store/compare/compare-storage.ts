"use client";

const COMPARE_STORAGE_KEY = "store-compare-product-ids";
const MAX_COMPARE_ITEMS = 4;

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getCompareProductIds(): string[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(COMPARE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item)).filter(Boolean);
  } catch {
    return [];
  }
}

function persistCompareProductIds(ids: string[]) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
}

export function isProductInCompare(productId: string): boolean {
  return getCompareProductIds().includes(productId);
}

export function toggleCompareProduct(productId: string): { inCompare: boolean; ids: string[]; maxReached: boolean } {
  const current = getCompareProductIds();
  if (current.includes(productId)) {
    const next = current.filter((id) => id !== productId);
    persistCompareProductIds(next);
    return { inCompare: false, ids: next, maxReached: false };
  }

  if (current.length >= MAX_COMPARE_ITEMS) {
    return { inCompare: false, ids: current, maxReached: true };
  }

  const next = [...current, productId];
  persistCompareProductIds(next);
  return { inCompare: true, ids: next, maxReached: false };
}

export function removeCompareProduct(productId: string): string[] {
  const next = getCompareProductIds().filter((id) => id !== productId);
  persistCompareProductIds(next);
  return next;
}

export function clearCompareProducts() {
  persistCompareProductIds([]);
}

export function getMaxCompareItems() {
  return MAX_COMPARE_ITEMS;
}

export function emitCompareUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("compare-updated"));
  }
}
