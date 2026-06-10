/**
 * Resolve the CRM backend base URL.
 *
 * Priority:
 *  1. NEXT_PUBLIC_CRM_BASE_URL (explicit override, baked at build time)
 *  2. The browser's current hostname on port 4000 — so the app works from any
 *     device on the LAN without rebuilding when the host IP changes.
 *  3. localhost fallback (SSR / build).
 */
function resolveBase(): string {
  if (process.env.NEXT_PUBLIC_CRM_BASE_URL) return process.env.NEXT_PUBLIC_CRM_BASE_URL;
  if (typeof window !== "undefined") return `http://${window.location.hostname}:4000/api`;
  return "http://localhost:4000/api";
}

const BASE = resolveBase();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  base: BASE,
  health: () => request<{ ok: boolean }>("/health"),
  seed: (customers = 300) =>
    request<{ brand: string; customers: number; orders: number; campaigns?: number }>("/seed", {
      method: "POST",
      body: JSON.stringify({ customers, reset: true })
    }),
  customers: (q = "", limit = 50) =>
    request<{ items: any[]; total: number }>(`/customers?q=${encodeURIComponent(q)}&limit=${limit}`),
  overview: () => request<any>("/analytics/overview"),
  personas: () => request<any[]>("/personas"),
  draft: (prompt: string, channel?: string) =>
    request<any>("/campaigns/draft", { method: "POST", body: JSON.stringify({ prompt, channel }) }),
  createCampaign: (draft: any) =>
    request<any>("/campaigns", { method: "POST", body: JSON.stringify(draft) }),
  launch: (id: string) => request<any>(`/campaigns/${id}/launch`, { method: "POST" }),
  campaigns: () => request<any[]>("/campaigns"),
  campaign: (id: string) => request<any>(`/campaigns/${id}`)
};
