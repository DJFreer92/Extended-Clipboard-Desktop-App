import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { appsService } from "./appsService";

const okJson = (body: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('appsService', () => {
  const g: any = globalThis as any;
  beforeEach(() => { g.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('getAllFromApps should return array of app names from direct array response', async () => {
    const mockApps = ["Safari", "Chrome", "TextEdit"];
    (globalThis.fetch as any).mockResolvedValueOnce(okJson(mockApps));

    const result = await appsService.getAllFromApps();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/clipboard/get_all_from_apps',
      expect.objectContaining({
        credentials: 'same-origin',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toEqual(["Safari", "Chrome", "TextEdit"]);
  });

  it('getAllFromApps should return array from wrapped response for backward compatibility', async () => {
    const mockResponse = { apps: ["Safari", "Chrome", "TextEdit"] };
    (globalThis.fetch as any).mockResolvedValueOnce(okJson(mockResponse));

    const result = await appsService.getAllFromApps();

    expect(result).toEqual(["Safari", "Chrome", "TextEdit"]);
  });

  it('getAllFromApps should filter out empty and non-string values', async () => {
    const mockApps = ["Safari", "", "  Chrome  ", null, "TextEdit", undefined, 123];
    (globalThis.fetch as any).mockResolvedValueOnce(okJson(mockApps));

    const result = await appsService.getAllFromApps();

    expect(result).toEqual(["Safari", "Chrome", "TextEdit"]);
  });

  it('getAllFromApps should trim whitespace from app names', async () => {
    const mockApps = ["  Safari  ", "\tChrome\t", "\nTextEdit\n"];
    (globalThis.fetch as any).mockResolvedValueOnce(okJson(mockApps));

    const result = await appsService.getAllFromApps();

    expect(result).toEqual(["Safari", "Chrome", "TextEdit"]);
  });

  it('getAllFromApps should return empty array on non-array response', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce(okJson({ invalid: "response" }));

    const result = await appsService.getAllFromApps();

    expect(result).toEqual([]);
  });

  it('getAllFromApps should return empty array on fetch error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (globalThis.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const result = await appsService.getAllFromApps();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch apps list', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
