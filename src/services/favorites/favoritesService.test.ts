import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { favoritesService } from "./favoritesService";

const okJson = (body: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('favoritesService', () => {
  const g: any = globalThis as any;
  beforeEach(() => { g.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('addFavorite should call correct endpoint with clip_id', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ ok: true }));

    await favoritesService.addFavorite(7);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/add_favorite?clip_id=7',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('removeFavorite should call correct endpoint with clip_id', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ ok: true }));

    await favoritesService.removeFavorite(7);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/remove_favorite?clip_id=7',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('getAllFavorites should return array of clip IDs', async () => {
    const mockResponse = { clip_ids: [1, 2, 3] };
    (globalThis.fetch as any).mockResolvedValueOnce(okJson(mockResponse));

    const result = await favoritesService.getAllFavorites();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/get_all_favorites',
      expect.objectContaining({
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toEqual([1, 2, 3]);
  });

  it('getNumFavorites should return count as number', async () => {
    const mockResponse = { count: 4 };
    (globalThis.fetch as any).mockResolvedValueOnce(okJson(mockResponse));

    const result = await favoritesService.getNumFavorites();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/get_num_favorites',
      expect.objectContaining({
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toBe(4);
  });

  it('should handle combined favorites operations correctly', async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce(okJson({ ok: true }))
      .mockResolvedValueOnce(okJson({ ok: true }))
      .mockResolvedValueOnce(okJson({ clip_ids: [1, 2, 3] }))
      .mockResolvedValueOnce(okJson({ count: 4 }));

    await favoritesService.addFavorite(7);
    await favoritesService.removeFavorite(7);
    const favorites = await favoritesService.getAllFavorites();
    const count = await favoritesService.getNumFavorites();

    expect(favorites).toEqual([1, 2, 3]);
    expect(count).toBe(4);
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });
});
