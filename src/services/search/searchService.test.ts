import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { searchService } from './searchService';

const okJson = (body: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('searchService – filtering and search', () => {
  const g: any = globalThis as any;
  beforeEach(() => { g.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('filterAllClips constructs proper query parameters', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ clips: [] }));
    await searchService.filterAllClips('a b', 'past_week', ['tag1','tag2'], ['App1','App2'], true);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/clipboard/filter_all_clips'), expect.any(Object));
    const url = (globalThis.fetch as any).mock.calls[0][0];
    expect(url).toContain('search=a+b');
    expect(url).toContain('time_frame=past_week');
    expect(url).toContain('selected_tags=tag1');
    expect(url).toContain('selected_tags=tag2');
    expect(url).toContain('selected_apps=App1');
    expect(url).toContain('selected_apps=App2');
    expect(url).toContain('favorites_only=true');
  });

  it('filterNClips includes n parameter when provided', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ clips: [] }));
    await searchService.filterNClips('a b', 'past_week', 10, [], ['AppX'], false);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringMatching(/filter_n_clips.*n=10.*selected_apps=AppX/), expect.any(Object));
  });

  it('filterAllClipsAfterId includes after_id parameter', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ clips: [] }));
    await searchService.filterAllClipsAfterId('search', 'past_month', 1, ['tag1'], ['App1'], false);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringMatching(/filter_all_clips_after_id.*after_id=1.*selected_tags=tag1.*selected_apps=App1/), expect.any(Object));
  });

  it('filterNClipsBeforeId includes before_id and favorites_only parameters', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ clips: [] }));
    await searchService.filterNClipsBeforeId('a b', 'past_week', 10, 100, [], ['App2','App3'], true);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/clipboard/filter_n_clips_before_id'), expect.any(Object));
    const url = (globalThis.fetch as any).mock.calls[0][0];
    expect(url).toContain('search=a+b');
    expect(url).toContain('time_frame=past_week');
    expect(url).toContain('before_id=100');
    expect(url).toContain('selected_apps=App2');
    expect(url).toContain('selected_apps=App3');
    expect(url).toContain('favorites_only=true');
  });

  it('getNumFilteredClips returns count from object response', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ count: 2 }));
    const result = await searchService.getNumFilteredClips('a b', 'past_week', [], ['AppZ'], false);
    expect(result).toBe(2);
  });

  it('getNumFilteredClips supports raw number response', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson(9));
    const result = await searchService.getNumFilteredClips('a', 'past_week');
    expect(result).toBe(9);
  });

  it('handles empty selectedTags and selectedApps arrays', async () => {
    (globalThis.fetch as any).mockResolvedValue(okJson({ clips: [] }));
    await searchService.filterAllClips('test', 'all', [], [], false);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/clipboard/filter_all_clips'), expect.any(Object));
    const url = (globalThis.fetch as any).mock.calls[0][0];
    expect(url).toContain('search=test');
    expect(url).toContain('time_frame=all');
    expect(url).toContain('favorites_only=false');
  });
});
