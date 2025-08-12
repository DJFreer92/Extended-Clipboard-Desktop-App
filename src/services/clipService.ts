// Lightweight client for the FastAPI clipboard endpoints
// Configure base URL via Vite: VITE_API_BASE_URL, default to localhost:8000

export interface ApiClip {
  id: number;
  content: string;
  timestamp: string; // ISO 8601
  from_app_name?: string | null;
  tags?: string[]; // server returns list of tag names
}

export interface ApiClips { clips: ApiClip[]; }

export interface ApiTag { id: number; name: string; }
export interface ApiTags { tags: ApiTag[]; }
export interface ApiFavoriteClipIDs { clip_ids: number[]; }
export interface ApiFromApps { apps: string[]; }

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
  async addClip(content: string, fromAppName?: string): Promise<void> {
    const payload = {
      id: 0,
      content,
      timestamp: new Date().toISOString(),
      from_app_name: fromAppName,
    };
    const qp = fromAppName ? `?from_app_name=${encodeURIComponent(fromAppName)}` : '';
    await http<void>(`/clipboard/add_clip${qp}`, { method: 'POST', body: JSON.stringify(payload) });
  },

  async deleteClip(id: number): Promise<void> {
    // FastAPI param is plain int; typical usage is query string for simple types on POST
    await http<void>(`/clipboard/delete_clip?id=${encodeURIComponent(id)}`, { method: 'POST' });
  },

  async deleteAllClips(): Promise<void> {
    await http<void>(`/clipboard/delete_all_clips`, { method: 'POST' });
  },

  // New pagination and filter endpoints
  // Server parameter name is `before_id` but represents a lower bound; returns clips with id > before_id
  async getAllClipsAfterId(beforeId: number): Promise<ApiClip[]> {
    const data = await http<ApiClips>(`/clipboard/get_all_clips_after_id?before_id=${encodeURIComponent(beforeId)}`);
    return data.clips ?? [];
  },

  async getNClipsBeforeId(n: number | null, beforeId: number): Promise<ApiClip[]> {
    const params = new URLSearchParams({ before_id: String(beforeId) });
    if (n != null) params.set('n', String(n));
    const data = await http<ApiClips>(`/clipboard/get_n_clips_before_id?${params.toString()}`);
    return data.clips ?? [];
  },

  async getNumClips(): Promise<number> {
    const res = await http<any>(`/clipboard/get_num_clips`);
    // Support either { count } or raw number
    if (typeof res === 'number') return res as number;
    if (res && typeof res.count === 'number') return res.count as number;
    return 0;
  },

  // Filtering endpoints now accept selected_tags[] and favorites_only and optional n/null semantics
  async filterAllClips(search: string, timeFrame: string, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search, time_frame: timeFrame });
    if (selectedTags.length) params.set('selected_tags', selectedTags.join(','));
    if (selectedApps.length) params.set('selected_apps', selectedApps.join(','));
    if (favoritesOnly) params.set('favorites_only', 'true');
    const data = await http<ApiClips>(`/clipboard/filter_all_clips?${params.toString()}`);
    return data.clips ?? [];
  },

  async filterNClips(search: string, timeFrame: string, n: number | null, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search, time_frame: timeFrame });
    if (n != null) params.set('n', String(n));
    if (selectedTags.length) params.set('selected_tags', selectedTags.join(','));
    if (selectedApps.length) params.set('selected_apps', selectedApps.join(','));
    if (favoritesOnly) params.set('favorites_only', 'true');
    const data = await http<ApiClips>(`/clipboard/filter_n_clips?${params.toString()}`);
    return data.clips ?? [];
  },

  async filterAllClipsAfterId(search: string, timeFrame: string, afterId: number, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search, time_frame: timeFrame, after_id: String(afterId) });
    if (selectedTags.length) params.set('selected_tags', selectedTags.join(','));
    if (selectedApps.length) params.set('selected_apps', selectedApps.join(','));
    if (favoritesOnly) params.set('favorites_only', 'true');
    const data = await http<ApiClips>(`/clipboard/filter_all_clips_after_id?${params.toString()}`);
    return data.clips ?? [];
  },

  async filterNClipsBeforeId(search: string, timeFrame: string, n: number | null, beforeId: number, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search, time_frame: timeFrame, before_id: String(beforeId) });
    if (n != null) params.set('n', String(n));
    if (selectedTags.length) params.set('selected_tags', selectedTags.join(','));
    if (selectedApps.length) params.set('selected_apps', selectedApps.join(','));
    if (favoritesOnly) params.set('favorites_only', 'true');
    const data = await http<ApiClips>(`/clipboard/filter_n_clips_before_id?${params.toString()}`);
    return data.clips ?? [];
  },

  async getNumFilteredClips(search: string, timeFrame: string, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<number> {
    const params = new URLSearchParams({ search, time_frame: timeFrame });
    if (selectedTags.length) params.set('selected_tags', selectedTags.join(','));
    if (selectedApps.length) params.set('selected_apps', selectedApps.join(','));
    if (favoritesOnly) params.set('favorites_only', 'true');
    const res = await http<any>(`/clipboard/get_num_filtered_clips?${params.toString()}`);
    if (typeof res === 'number') return res as number;
    if (res && typeof res.count === 'number') return res.count as number;
    return 0;
  },

  // Tag management
  async addClipTag(clipId: number, tagName: string): Promise<void> {
    await http<void>(`/clipboard/add_clip_tag?clip_id=${encodeURIComponent(clipId)}&tag_name=${encodeURIComponent(tagName)}`, { method: 'POST' });
  },
  async removeClipTag(clipId: number, tagId: number): Promise<void> {
    await http<void>(`/clipboard/remove_clip_tag?clip_id=${encodeURIComponent(clipId)}&tag_id=${encodeURIComponent(tagId)}`, { method: 'POST' });
  },
  async getAllTags(): Promise<ApiTag[]> {
    const data = await http<ApiTags>(`/clipboard/get_all_tags`);
    return data.tags ?? [];
  },
  async getNumClipsPerTag(tagId: number): Promise<number> {
    const res = await http<any>(`/clipboard/get_num_clips_per_tag?tag_id=${encodeURIComponent(tagId)}`);
    if (typeof res === 'number') return res;
    if (res && typeof res.count === 'number') return res.count;
    return 0;
  },

  // Favorites management
  async addFavorite(clipId: number): Promise<void> {
    await http<void>(`/clipboard/add_favorite?clip_id=${encodeURIComponent(clipId)}`, { method: 'POST' });
  },
  async removeFavorite(clipId: number): Promise<void> {
    await http<void>(`/clipboard/remove_favorite?clip_id=${encodeURIComponent(clipId)}`, { method: 'POST' });
  },
  async getAllFavorites(): Promise<number[]> {
    const data = await http<ApiFavoriteClipIDs>(`/clipboard/get_all_favorites`);
    return data.clip_ids ?? [];
  },
  async getNumFavorites(): Promise<number> {
    const res = await http<any>(`/clipboard/get_num_favorites`);
    if (typeof res === 'number') return res;
    if (res && typeof res.count === 'number') return res.count;
    return 0;
  },

  // Applications list (distinct from_app_name values)
  async getAllFromApps(): Promise<string[]> {
    try {
      const data = await http<ApiFromApps>(`/clipboard/get_all_from_apps`);
      // Support either { apps: [] } or { from_apps: [] } or raw array fallback
      if (Array.isArray((data as any))) return (data as any) as string[];
      if (data && Array.isArray((data as any).apps)) return (data as any).apps as string[];
      if (data && Array.isArray((data as any).from_apps)) return (data as any).from_apps as string[];
      return [];
    } catch (e) {
      console.error('Failed to fetch apps list', e);
      return [];
    }
  },
};

export type { ApiClip as ClipDTO };
