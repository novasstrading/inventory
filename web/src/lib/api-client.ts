"use client";

/** Thin fetch wrapper that unwraps the {ok, ...}/{ok:false, error} envelope from lib/http.ts. */
export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({ ok: false, error: "Unexpected server response." }));
  if (!data.ok) throw new Error(data.error ?? "Request failed.");
  return data as T;
}
