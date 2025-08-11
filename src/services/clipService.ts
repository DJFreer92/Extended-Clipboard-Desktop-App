// Lightweight client for the FastAPI clipboard endpoints
// Configure base URL via Vite: VITE_API_BASE_URL, default to localhost:8000

export interface ApiClip {
  id: number;
  content: string;
  timestamp: string; // ISO 8601
}

export interface ApiClips {
  clips: ApiClip[];
}

// In development, we rely on Vite dev proxy and use relative URLs to avoid CORS.
// In production, VITE_API_BASE_URL can be set to the absolute API origin.
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_BASE_URL || "";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
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

export const clipService = {
  async getRecentClips(n: number = 10): Promise<ApiClip[]> {
    const data = await http<ApiClips>(`/clipboard/get_recent_clips?n=${encodeURIComponent(n)}`);
    return data.clips ?? [];
  },

  async getAllClips(): Promise<ApiClip[]> {
    const data = await http<ApiClips>(`/clipboard/get_all_clips`);
    return data.clips ?? [];
  },

  // Add a new clip by content only; server assigns id and timestamp
  async addClip(content: string): Promise<void> {
    // Some server schemas require full object; provide placeholder id and current timestamp
    const payload = {
      id: 0,
      content,
      timestamp: new Date().toISOString(),
    };
    await http<void>(`/clipboard/add_clip`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteClip(id: number): Promise<void> {
    // FastAPI param is plain int; typical usage is query string for simple types on POST
    await http<void>(`/clipboard/delete_clip?id=${encodeURIComponent(id)}`, { method: 'POST' });
  },

  async deleteAllClips(): Promise<void> {
    await http<void>(`/clipboard/delete_all_clips`, { method: 'POST' });
  },

  // New pagination and filter endpoints
  async getAllClipsAfterId(beforeId: number): Promise<ApiClip[]> {
    const data = await http<ApiClips>(`/clipboard/get_all_clips_after_id?after_id=${encodeURIComponent(beforeId)}`);
    return data.clips ?? [];
  },

  async getNClipsBeforeId(n: number, beforeId: number): Promise<ApiClip[]> {
    const data = await http<ApiClips>(`/clipboard/get_n_clips_before_id?n=${encodeURIComponent(n)}&before_id=${encodeURIComponent(beforeId)}`);
    return data.clips ?? [];
  },

  async getNumClips(): Promise<number> {
    const res = await http<any>(`/clipboard/get_num_clips`);
    // Support either { count } or raw number
    if (typeof res === 'number') return res as number;
    if (res && typeof res.count === 'number') return res.count as number;
    return 0;
  },

  async filterAllClips(searchCSV: string, timeFrame: string): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search: searchCSV, time_frame: timeFrame });
    const data = await http<ApiClips>(`/clipboard/filter_all_clips?${params.toString()}`);
    return data.clips ?? [];
  },

  async filterNClips(searchCSV: string, timeFrame: string, n: number): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search: searchCSV, time_frame: timeFrame, n: String(n) });
    const data = await http<ApiClips>(`/clipboard/filter_n_clips?${params.toString()}`);
    return data.clips ?? [];
  },

  async filterAllClipsAfterId(searchCSV: string, timeFrame: string, afterId: number): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search: searchCSV, time_frame: timeFrame, after_id: String(afterId) });
    const data = await http<ApiClips>(`/clipboard/filter_all_clips_after_id?${params.toString()}`);
    return data.clips ?? [];
  },

  async filterNClipsBeforeId(searchCSV: string, timeFrame: string, n: number, beforeId: number): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search: searchCSV, time_frame: timeFrame, n: String(n), before_id: String(beforeId) });
    const data = await http<ApiClips>(`/clipboard/filter_n_clips_before_id?${params.toString()}`);
    return data.clips ?? [];
  },

  async getNumFilteredClips(searchCSV: string, timeFrame: string): Promise<number> {
    const params = new URLSearchParams({ search: searchCSV, time_frame: timeFrame });
    const res = await http<any>(`/clipboard/get_num_filtered_clips?${params.toString()}`);
    if (typeof res === 'number') return res as number;
    if (res && typeof res.count === 'number') return res.count as number;
    return 0;
  },
};

export type { ApiClip as ClipDTO };
