// Tags management service for clips
import { http } from '../shared/http';
import type { ApiTag, ApiTags } from '../shared/types';

interface TagCountResponse { count: number }

export const tagsService = {
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
    const res = await http<TagCountResponse | number>(`/clipboard/get_num_clips_per_tag?tag_id=${encodeURIComponent(tagId)}`);
    if (typeof res === 'number') return res;
    if (res && typeof (res as TagCountResponse).count === 'number') return (res as TagCountResponse).count;
    return 0;
  },
};
