import { http } from '../shared/http';
import type { ApiClip } from '../shared/types';

export const searchService = {
  // Filtering endpoints accept selected_tags[] and favorites_only and optional n/null semantics
  async filterAllClips(search: string, timeFrame: string, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search, time_frame: timeFrame, favorites_only: favoritesOnly.toString() });
    if (selectedTags.length) selectedTags.forEach(t => params.append('selected_tags', t));
    if (selectedApps.length) selectedApps.forEach(a => params.append('selected_apps', a));
    return await http<ApiClip[]>(`/clipboard/filter_all_clips?${params}`);
  },

  async filterNClips(search: string, timeFrame: string, n: number | null, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search, time_frame: timeFrame, favorites_only: favoritesOnly.toString() });
    if (n !== null) params.append('n', n.toString());
    if (selectedTags.length) selectedTags.forEach(t => params.append('selected_tags', t));
    if (selectedApps.length) selectedApps.forEach(a => params.append('selected_apps', a));
    return await http<ApiClip[]>(`/clipboard/filter_n_clips?${params}`);
  },

  async filterAllClipsAfterId(search: string, timeFrame: string, afterId: number, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search, time_frame: timeFrame, after_id: afterId.toString(), favorites_only: favoritesOnly.toString() });
    if (selectedTags.length) selectedTags.forEach(t => params.append('selected_tags', t));
    if (selectedApps.length) selectedApps.forEach(a => params.append('selected_apps', a));
    return await http<ApiClip[]>(`/clipboard/filter_all_clips_after_id?${params}`);
  },

  async filterNClipsBeforeId(search: string, timeFrame: string, n: number | null, beforeId: number, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<ApiClip[]> {
    const params = new URLSearchParams({ search, time_frame: timeFrame, before_id: beforeId.toString(), favorites_only: favoritesOnly.toString() });
    if (n !== null) params.append('n', n.toString());
    if (selectedTags.length) selectedTags.forEach(t => params.append('selected_tags', t));
    if (selectedApps.length) selectedApps.forEach(a => params.append('selected_apps', a));
    return await http<ApiClip[]>(`/clipboard/filter_n_clips_before_id?${params}`);
  },

  async getNumFilteredClips(search: string, timeFrame: string, selectedTags: string[] = [], selectedApps: string[] = [], favoritesOnly = false): Promise<number> {
    const params = new URLSearchParams({ search, time_frame: timeFrame, favorites_only: favoritesOnly.toString() });
    if (selectedTags.length) selectedTags.forEach(t => params.append('selected_tags', t));
    if (selectedApps.length) selectedApps.forEach(a => params.append('selected_apps', a));
    interface CountResponse { count: number }
    const res = await http<CountResponse | number>(`/clipboard/get_num_filtered_clips?${params}`);
    if (typeof res === 'number') return res;
    if (res && typeof (res as CountResponse).count === 'number') return (res as CountResponse).count;
    return 0;
  },
};