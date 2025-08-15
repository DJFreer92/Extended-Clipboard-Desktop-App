// Favorites management service for clips
import { http } from '../shared/http';
import type { ApiFavoriteClipIDs } from '../shared/types';

export const favoritesService = {
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
};
