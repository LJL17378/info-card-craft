const buckets = (globalThis as typeof globalThis & {
  __infoCardRateLimits?: Map<string, { count: number; resetAt: number }>;
}).__infoCardRateLimits ??= new Map();

export function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}
