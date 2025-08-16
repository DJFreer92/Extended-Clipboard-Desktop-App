import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { clipsService } from "./clipsService";

const okJson = (body: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('clipsService', () => {
  const g: any = globalThis as any;
  beforeEach(() => { g.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('getRecentClips should call correct endpoint with limit', async () => {
    const mockClips = [{ id: 1, content: 'test' }];
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ clips: mockClips }));

    const result = await clipsService.getRecentClips(5);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/get_recent_clips?n=5',
      expect.objectContaining({
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toEqual(mockClips);
  });

  it('getAllClips should call correct endpoint', async () => {
    const mockClips = [{ id: 1, content: 'test' }];
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ clips: mockClips }));

    const result = await clipsService.getAllClips();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/get_all_clips',
      expect.objectContaining({
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toEqual(mockClips);
  });

  it('addClip should call correct endpoint with content', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ ok: true }));

    await clipsService.addClip('test content');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/add_clip',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test content' })
      })
    );
  });

  it('addClip should include fromAppName when provided', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ ok: true }));

    await clipsService.addClip('test content', 'VSCode');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/add_clip?from_app_name=VSCode',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ content: 'test content', from_app_name: 'VSCode' })
      })
    );
  });

  it('deleteClip should call correct endpoint with clip ID', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ ok: true }));

    await clipsService.deleteClip(42);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/delete_clip?clip_id=42',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('deleteAllClips should call correct endpoint', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ ok: true }));

    await clipsService.deleteAllClips();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/delete_all_clips',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('getNumClips should return count as number', async () => {
    const mockResponse = { count: 5 };
    (globalThis.fetch as any).mockResolvedValueOnce(okJson(mockResponse));

    const result = await clipsService.getNumClips();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/get_num_clips',
      expect.objectContaining({
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toBe(5);
  });

  it('getAllClipsAfterId should call correct endpoint with afterId', async () => {
    const mockClips = [{ id: 2, content: 'newer' }];
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ clips: mockClips }));

    const result = await clipsService.getAllClipsAfterId(1);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/get_all_clips_after_id?after_id=1',
      expect.objectContaining({
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toEqual(mockClips);
  });

  it('getNClipsBeforeId should call correct endpoint with beforeId and n', async () => {
    const mockClips = [{ id: 1, content: 'older' }];
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ clips: mockClips }));

    const result = await clipsService.getNClipsBeforeId(5, 10);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/get_n_clips_before_id?n=5&before_id=10',
      expect.objectContaining({
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toEqual(mockClips);
  });

  it('getNClipsBeforeId should handle null n parameter', async () => {
    const mockClips = [{ id: 1, content: 'older' }];
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ clips: mockClips }));

    const result = await clipsService.getNClipsBeforeId(null, 10);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/get_n_clips_before_id?before_id=10',
      expect.objectContaining({
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toEqual(mockClips);
  });

  it('should handle combined CRUD operations correctly', async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce(okJson({ ok: true }))
      .mockResolvedValueOnce(okJson({ clips: [{ id: 1, content: 'test' }] }))
      .mockResolvedValueOnce(okJson({ count: 1 }))
      .mockResolvedValueOnce(okJson({ ok: true }));

    await clipsService.addClip('test content');
    const clips = await clipsService.getRecentClips(1);
    const count = await clipsService.getNumClips();
    await clipsService.deleteClip(1);

    expect(clips).toEqual([{ id: 1, content: 'test' }]);
    expect(count).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });
});