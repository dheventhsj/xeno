/** Headers for seed API calls (production requires x-seed-secret when configured). */
export function seedRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.NEXT_PUBLIC_SEED_DEMO_KEY;
  if (key) headers["x-seed-secret"] = key;
  return headers;
}
