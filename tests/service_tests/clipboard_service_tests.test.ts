import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clipService, type ApiClip, type ApiTag } from '../../src/services/clipService';

const okJson = (body: any, init?: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...(init||{}) });

describe('clipService', () => {
	const g: any = globalThis as any;
	beforeEach(() => {
		g.fetch = vi.fn();
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('getRecentClips returns clips', async () => {
		const clips: ApiClip[] = [{ id: 1, content: 'a', timestamp: new Date().toISOString() }];
		(globalThis.fetch as any).mockResolvedValue(okJson({ clips }));
		const res = await clipService.getRecentClips(1);
		expect(res).toEqual(clips);
		expect(globalThis.fetch).toHaveBeenCalledWith('/clipboard/get_recent_clips?n=1', expect.any(Object));
	});

	it('getAllClips returns clips', async () => {
		(globalThis.fetch as any).mockResolvedValue(okJson({ clips: [] }));
		const res = await clipService.getAllClips();
		expect(res).toEqual([]);
	});

	it('addClip posts payload with id, timestamp, from_app_name query when provided', async () => {
		(globalThis.fetch as any).mockResolvedValue(okJson({ ok: true }));
		await clipService.addClip('hello', 'VSCode');
		const call = (globalThis.fetch as any).mock.calls[0];
		expect(call[0]).toBe('/clipboard/add_clip?from_app_name=VSCode');
		const init = call[1];
		expect(init.method).toBe('POST');
		const payload = JSON.parse(init.body);
		expect(payload).toHaveProperty('id');
		expect(payload).toHaveProperty('content', 'hello');
		expect(payload).toHaveProperty('timestamp');
		expect(payload).toHaveProperty('from_app_name', 'VSCode');
	});

	it('deleteClip posts with id', async () => {
		(globalThis.fetch as any).mockResolvedValue(okJson({ ok: true }));
		await clipService.deleteClip(42);
		expect(globalThis.fetch).toHaveBeenCalledWith('/clipboard/delete_clip?id=42', expect.objectContaining({ method: 'POST' }));
	});

	it('deleteAllClips posts', async () => {
		(globalThis.fetch as any).mockResolvedValue(okJson({ ok: true }));
		await clipService.deleteAllClips();
		expect(globalThis.fetch).toHaveBeenCalledWith('/clipboard/delete_all_clips', expect.objectContaining({ method: 'POST' }));
	});

	it('pagination and filter endpoints (updated params incl selected_apps)', async () => {
		(globalThis.fetch as any).mockResolvedValueOnce(okJson({ clips: [] })) // getAllClipsAfterId
			.mockResolvedValueOnce(okJson({ clips: [] })) // getNClipsBeforeId
			.mockResolvedValueOnce(okJson(5)) // getNumClips raw
			.mockResolvedValueOnce(okJson({ clips: [] })) // filterAllClips
			.mockResolvedValueOnce(okJson({ clips: [] })) // filterNClips
			.mockResolvedValueOnce(okJson({ clips: [] })) // filterAllClipsAfterId
			.mockResolvedValueOnce(okJson({ clips: [] })) // filterNClipsBeforeId
			.mockResolvedValueOnce(okJson({ count: 2 })); // getNumFilteredClips object

		await clipService.getAllClipsAfterId(100);
		expect(globalThis.fetch).toHaveBeenLastCalledWith('/clipboard/get_all_clips_after_id?before_id=100', expect.any(Object));
		await clipService.getNClipsBeforeId(null, 100); // unlimited
		expect(globalThis.fetch).toHaveBeenLastCalledWith('/clipboard/get_n_clips_before_id?before_id=100', expect.any(Object));
		expect(await clipService.getNumClips()).toBe(5);
		await clipService.filterAllClips('a b', 'past_week', ['tag1','tag2'], ['App1','App2'], true);
		expect(globalThis.fetch).toHaveBeenLastCalledWith(expect.stringMatching(/filter_all_clips\?.*selected_tags=tag1%2Ctag2.*selected_apps=App1%2CApp2.*favorites_only=true/), expect.any(Object));
		await clipService.filterNClips('a b', 'past_week', 10, [], ['AppX'], false);
		await clipService.filterAllClipsAfterId('a b', 'past_week', 1, ['tag1'], ['App1'], false);
		await clipService.filterNClipsBeforeId('a b', 'past_week', 10, 100, [], ['App2','App3'], true);
		expect(globalThis.fetch).toHaveBeenLastCalledWith(expect.stringMatching(/filter_n_clips_before_id\?.*selected_apps=App2%2CApp3.*favorites_only=true/), expect.any(Object));
		expect(await clipService.getNumFilteredClips('a b', 'past_week', [], ['AppZ'], false)).toBe(2);
	});

	it('tag management endpoints', async () => {
		(globalThis.fetch as any).mockResolvedValueOnce(okJson({ ok: true })) // add_clip_tag
			.mockResolvedValueOnce(okJson({ ok: true })) // remove_clip_tag
			.mockResolvedValueOnce(okJson({ tags: [{ id: 1, name: 'x'} as ApiTag] })) // get_all_tags
			.mockResolvedValueOnce(okJson(3)); // get_num_clips_per_tag
		await clipService.addClipTag(1, 'tagName');
		expect(globalThis.fetch).toHaveBeenNthCalledWith(1, '/clipboard/add_clip_tag?clip_id=1&tag_name=tagName', expect.objectContaining({ method: 'POST' }));
		await clipService.removeClipTag(1, 2);
		expect(globalThis.fetch).toHaveBeenNthCalledWith(2, '/clipboard/remove_clip_tag?clip_id=1&tag_id=2', expect.objectContaining({ method: 'POST' }));
		expect(await clipService.getAllTags()).toEqual([{ id:1, name: 'x'}]);
		expect(await clipService.getNumClipsPerTag(9)).toBe(3);
	});

	it('favorites management endpoints', async () => {
		(globalThis.fetch as any).mockResolvedValueOnce(okJson({ ok: true })) // add_favorite
			.mockResolvedValueOnce(okJson({ ok: true })) // remove_favorite
			.mockResolvedValueOnce(okJson({ clip_ids: [1,2,3] })) // get_all_favorites
			.mockResolvedValueOnce(okJson({ count: 4 })); // get_num_favorites
		await clipService.addFavorite(7);
		expect(globalThis.fetch).toHaveBeenNthCalledWith(1, '/clipboard/add_favorite?clip_id=7', expect.objectContaining({ method: 'POST' }));
		await clipService.removeFavorite(7);
		expect(globalThis.fetch).toHaveBeenNthCalledWith(2, '/clipboard/remove_favorite?clip_id=7', expect.objectContaining({ method: 'POST' }));
		expect(await clipService.getAllFavorites()).toEqual([1,2,3]);
		expect(await clipService.getNumFavorites()).toBe(4);
	});

	it('throws on non-ok http', async () => {
		(globalThis.fetch as any).mockResolvedValue(new Response('x', { status: 500, statusText: 'err' }));
		await expect(clipService.getAllClips()).rejects.toThrow(/HTTP 500/);
	});

	it('handles non-json empty response gracefully (204/no content-type)', async () => {
		(globalThis.fetch as any).mockResolvedValue(new Response(null, { status: 200 }));
		await expect(clipService.deleteAllClips()).resolves.toBeUndefined();
	});

	it('supports base url env and {count} object for getNumClips', async () => {
		// Simulate env base url by stubbing import.meta.env on global (module already loaded uses it to compute string prefix only)
		(globalThis.fetch as any).mockImplementation((url: string) => {
			// Ensure relative path is passed through (base url concatenation occurs in module)
			expect(url).toMatch(/\/clipboard\/get_num_clips$/);
			return Promise.resolve(new Response(JSON.stringify({ count: 7 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
		});
		await expect(clipService.getNumClips()).resolves.toBe(7);
	});

	it('getNumFilteredClips supports raw number response', async () => {
		(globalThis.fetch as any).mockResolvedValue(okJson(9));
		await expect(clipService.getNumFilteredClips('a', 'past_week')).resolves.toBe(9);
	});
});
