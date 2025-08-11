import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clipService, type ApiClip } from '../../src/services/clipService';

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

	it('addClip posts payload with id and timestamp', async () => {
		(globalThis.fetch as any).mockResolvedValue(okJson({ ok: true }));
		await clipService.addClip('hello');
		const call = (globalThis.fetch as any).mock.calls[0];
		expect(call[0]).toBe('/clipboard/add_clip');
		const init = call[1];
		expect(init.method).toBe('POST');
		const payload = JSON.parse(init.body);
		expect(payload).toHaveProperty('id');
		expect(payload).toHaveProperty('content', 'hello');
		expect(payload).toHaveProperty('timestamp');
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

	it('pagination and filter endpoints', async () => {
		(globalThis.fetch as any).mockResolvedValueOnce(okJson({ clips: [] })) // getAllClipsAfterId
			.mockResolvedValueOnce(okJson({ clips: [] })) // getNClipsBeforeId
			.mockResolvedValueOnce(okJson(5)) // getNumClips raw
			.mockResolvedValueOnce(okJson({ clips: [] })) // filterAllClips
			.mockResolvedValueOnce(okJson({ clips: [] })) // filterNClips
			.mockResolvedValueOnce(okJson({ clips: [] })) // filterAllClipsAfterId
			.mockResolvedValueOnce(okJson({ clips: [] })) // filterNClipsBeforeId
			.mockResolvedValueOnce(okJson({ count: 2 })); // getNumFilteredClips object

		await clipService.getAllClipsAfterId(100);
		await clipService.getNClipsBeforeId(10, 100);
		expect(await clipService.getNumClips()).toBe(5);
		await clipService.filterAllClips('a,b', 'past_week');
		await clipService.filterNClips('a,b', 'past_week', 10);
		await clipService.filterAllClipsAfterId('a,b', 'past_week', 1);
		await clipService.filterNClipsBeforeId('a,b', 'past_week', 10, 100);
		expect(await clipService.getNumFilteredClips('a,b', 'past_week')).toBe(2);
	});

	it('throws on non-ok http', async () => {
		(globalThis.fetch as any).mockResolvedValue(new Response('x', { status: 500, statusText: 'err' }));
		await expect(clipService.getAllClips()).rejects.toThrow(/HTTP 500/);
	});
});
