type ValidationResult =
  | { valid: true; mode: "mock" | "live" }
  | { valid: false; missing: string[] };

export function validateShiprocketEnv(): ValidationResult {
  const isMock = String(process.env.SHIPROCKET_MOCK_MODE ?? "").toLowerCase() === "true";
  if (isMock) return { valid: true, mode: "mock" };

  const missing: string[] = [];
  if (!process.env.SHIPROCKET_API_EMAIL) missing.push("SHIPROCKET_API_EMAIL");
  if (!process.env.SHIPROCKET_API_PASSWORD) missing.push("SHIPROCKET_API_PASSWORD");

  if (missing.length > 0) {
    console.error("[Shiprocket] Missing env vars:", missing.join(", "));
    console.error("[Shiprocket] Set SHIPROCKET_MOCK_MODE=true for local dev");
    return { valid: false, missing };
  }

  return { valid: true, mode: "live" };
}

