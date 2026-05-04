export function isMockAWB(awbCode?: string | null) {
  const normalized = String(awbCode ?? "").trim().toUpperCase();
  if (!normalized) return true;
  return normalized.startsWith("MOCK-") || normalized.startsWith("TEST-");
}

