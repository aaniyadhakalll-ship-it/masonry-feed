import type { PinPage } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function fetchFeed(cursor: number | undefined, limit: number, signal?: AbortSignal): Promise<PinPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor !== undefined) params.set("cursor", String(cursor));
  const res = await fetch(`${BASE}/feed?${params}`, { signal });
  if (res.status === 429) throw new Error("Too many requests. Wait a moment and retry.");
  if (!res.ok) throw new Error(`Couldn't load pins (HTTP ${res.status}).`);
  return res.json();
}
