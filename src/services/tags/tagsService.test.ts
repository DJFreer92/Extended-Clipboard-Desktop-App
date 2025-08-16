import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { tagsService } from './tagsService';
import type { ApiTag } from '../shared/types';

const okJson = (body: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('tagsService – tag management', () => {
  const g: any = globalThis as any;
  beforeEach(() => { g.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('addClipTag posts with clip_id and tag_name parameters', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ ok: true }));
    await tagsService.addClipTag(1, 'tagName');
    expect(globalThis.fetch).toHaveBeenCalledWith('/clipboard/add_clip_tag?clip_id=1&tag_name=tagName', expect.objectContaining({ method: 'POST' }));
  });

  it('removeClipTag posts with clip_id and tag_id parameters', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ ok: true }));
    await tagsService.removeClipTag(1, 2);
    expect(globalThis.fetch).toHaveBeenCalledWith('/clipboard/remove_clip_tag?clip_id=1&tag_id=2', expect.objectContaining({ method: 'POST' }));
  });

  it('getAllTags returns array of tags', async () => {
    const tags: ApiTag[] = [{ id: 1, name: 'work' }, { id: 2, name: 'personal' }];
    (globalThis.fetch as any).mockResolvedValue(okJson({ tags }));
    const result = await tagsService.getAllTags();
    expect(result).toEqual(tags);
  });

  it('getAllTags handles empty tags array', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ tags: [] }));
    const result = await tagsService.getAllTags();
    expect(result).toEqual([]);
  });

  it('getNumClipsPerTag returns count as number', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ count: 5 }));
    const result = await tagsService.getNumClipsPerTag(9);
    expect(result).toBe(5);
  });

  it('getNumClipsPerTag handles raw number response', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson(3));
    const result = await tagsService.getNumClipsPerTag(9);
    expect(result).toBe(3);
  });
});
