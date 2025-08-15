// Shared HTTP utility for all clipboard services

// In development, we rely on Vite dev proxy and use relative URLs to avoid CORS.
// In production, VITE_API_BASE_URL can be set to the absolute API origin.
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_BASE_URL || "";

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    // Ensure CORS preflight and cookies behave consistently in dev
    mode: (import.meta as any)?.env?.DEV ? 'cors' : init?.mode,
    credentials: init?.credentials ?? 'same-origin',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${path}${text ? `: ${text}` : ''}`);
  }
  // Some endpoints return no content (204/empty). Try JSON but tolerate empty.
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return undefined as unknown as T;
}
