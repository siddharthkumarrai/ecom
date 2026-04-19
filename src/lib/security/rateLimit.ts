// Placeholder: wire Upstash Redis rate limiting here.
// In production you should enforce limits on cart/orders/search endpoints.
export async function rateLimitOrThrow(_key: string, _max: number, _windowMs: number) {
  void _key;
  void _max;
  void _windowMs;
  return;
}

