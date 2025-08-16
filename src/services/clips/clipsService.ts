import { http } from '../shared/http';
import type { ApiClip, ApiClips } from '../shared/types';

export const clipsService = {
  // Basic CRUD operations for clips
  async getRecentClips(n: number): Promise<ApiClip[]> {
    const response = await http<ApiClips>(`/clipboard/get_recent_clips?n=${n}`);
    return response.clips || [];
  },

  async getAllClips(): Promise<ApiClip[]> {
    const response = await http<ApiClips>(`/clipboard/get_all_clips`);
    return response.clips || [];
  },

  async addClip(content: string, fromAppName?: string): Promise<void> {
    const body = {
      content,
      from_app_name: fromAppName,
    };
    const qp = fromAppName ? `?from_app_name=${encodeURIComponent(fromAppName)}` : '';
    await http(`/clipboard/add_clip${qp}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async deleteClip(clipId: number): Promise<void> {
    await http(`/clipboard/delete_clip?clip_id=${clipId}`, {
      method: 'POST',
    });
  },

  async deleteAllClips(): Promise<void> {
    await http(`/clipboard/delete_all_clips`, {
      method: 'POST',
    });
  },

  async getNumClips(): Promise<number> {
    interface CountResponse { count: number }
    const res = await http<CountResponse | number>(`/clipboard/get_num_clips`);
    if (typeof res === 'number') return res;
    if (res && typeof (res as CountResponse).count === 'number') return (res as CountResponse).count;
    return 0;
  },

  // Pagination methods
  async getAllClipsAfterId(afterId: number): Promise<ApiClip[]> {
    const response = await http<ApiClips>(`/clipboard/get_all_clips_after_id?after_id=${afterId}`);
    return response.clips || [];
  },

  async getNClipsBeforeId(n: number | null, beforeId: number): Promise<ApiClip[]> {
    const params = new URLSearchParams();
    if (n !== null) params.append('n', n.toString());
    params.append('before_id', beforeId.toString());
    const response = await http<ApiClips>(`/clipboard/get_n_clips_before_id?${params}`);
    return response.clips || [];
  },
};