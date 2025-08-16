import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSettings } from '../features/settings/hooks/useSettings';

// Mock the clipsService
vi.mock('../../services/clips/clipsService', () => ({
  clipsService: {
    deleteAllClips: vi.fn(),
  }
}));

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(),
  writable: true,
});

// Mock window.dispatchEvent
Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
  writable: true,
});

describe('useSettings Hook - ClipsDeleted Event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should dispatch clipsDeleted event after successful deletion', async () => {
    const { clipsService } = await import('../../services/clips/clipsService');

    // Mock successful deletion
    (clipsService.deleteAllClips as any).mockResolvedValue(undefined);
    (window.confirm as any).mockReturnValue(true);

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      const success = await result.current.deleteAllClips();
      expect(success).toBe(true);
    });

    // Verify that the custom event was dispatched
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'clipsDeleted'
      })
    );
  });

  it('should not dispatch clipsDeleted event if deletion fails', async () => {
    const { clipsService } = await import('../../services/clips/clipsService');

    // Mock failed deletion
    (clipsService.deleteAllClips as any).mockRejectedValue(new Error('Delete failed'));
    (window.confirm as any).mockReturnValue(true);

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      const success = await result.current.deleteAllClips();
      expect(success).toBe(false);
    });

    // Verify that the custom event was NOT dispatched
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('should not dispatch clipsDeleted event if user cancels', async () => {
    // Mock user cancellation
    (window.confirm as any).mockReturnValue(false);

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      const success = await result.current.deleteAllClips();
      expect(success).toBe(false);
    });

    // Verify that the custom event was NOT dispatched
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });
});
