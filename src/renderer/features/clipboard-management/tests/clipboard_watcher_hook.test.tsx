import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClipboardWatcher } from '../../../hooks/useClipboardWatcher';
import { clipService } from '../../../../services/clipService';
import type { ClipModel } from '../../../../models/clip';

vi.mock('../../../../services/clipService', () => {
  return { clipService: { addClip: vi.fn().mockResolvedValue(undefined) } };
});

// Helper to advance fake timers and flush promises
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe('useClipboardWatcher', () => {
  const existing: ClipModel[] = [];
  let onNew: any;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    onNew = vi.fn();
    (window as any).electronAPI.clipboard.readText.mockReturnValue('initial');
    (window as any).electronAPI.frontmostApp.getName.mockResolvedValue('FrontApp');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('polling path adds new clipboard content', async () => {
    const { result } = renderHook(() => useClipboardWatcher({ enabled: true, deps: [], onNewClip: onNew, existingClips: existing }));
    // initial priming happens synchronously inside startPolling
    await advance(1500); // first interval tick
    // simulate changed clipboard text
    (window as any).electronAPI.clipboard.readText.mockReturnValue('second');
    await advance(1500);
  expect(clipService.addClip).toHaveBeenCalledWith('second', expect.any(String));
    expect(onNew).toHaveBeenCalledWith(true);
    // self copy guard test
    result.current.markSelfCopy('self');
    (window as any).electronAPI.clipboard.readText.mockReturnValue('self');
    await advance(1500);
    // Should suppress due to guard
    expect(clipService.addClip).not.toHaveBeenCalledWith('self', expect.anything());
  });

  it('suppresses duplicate clipboard change within suppress window', async () => {
    renderHook(() => useClipboardWatcher({ enabled: true, deps: [], onNewClip: onNew, existingClips: existing, guardDurationMs: 5000 }));
    // First change from primed value: we need to simulate different initial then A
    (window as any).electronAPI.clipboard.readText.mockReturnValue('first');
    await advance(1500); // prime to 'first'
    (window as any).electronAPI.clipboard.readText.mockReturnValue('A');
    await advance(1500); // detect A
  expect(clipService.addClip).toHaveBeenCalledWith('A', expect.any(String));
    // Duplicate within guard duration should be suppressed
    (window as any).electronAPI.clipboard.readText.mockReturnValue('A');
    await advance(1500); // suppressed repeat of A
    (window as any).electronAPI.clipboard.readText.mockReturnValue('B');
    await advance(1500); // add B
    const calls = (clipService.addClip as any).mock.calls.map((c: any[]) => c[0]);
    expect(calls.filter((x: string) => x === 'A').length).toBe(1);
    expect(calls.filter((x: string) => x === 'B').length).toBe(1);
  });

  it('background path uses onNew subscription when active', async () => {
    const unsubscribe = vi.fn();
    let handler: any;
    (window as any).electronAPI.background = {
      isActive: vi.fn().mockResolvedValue(true),
      onNew: (cb: any) => { handler = cb; return unsubscribe; },
    };
    renderHook(() => useClipboardWatcher({ enabled: true, deps: [], onNewClip: onNew, existingClips: existing }));
    await Promise.resolve();
  handler({ text: 'bgClip' });
  await Promise.resolve();
  await Promise.resolve(); // flush addClip then onNewClip
  expect(clipService.addClip).toHaveBeenCalledWith('bgClip', expect.any(String));
  expect(onNew).toHaveBeenCalledWith(true);
  });

  it('falls back to polling when background inactive or errors', async () => {
    (window as any).electronAPI.background = {
      isActive: vi.fn().mockResolvedValue(false),
      onNew: vi.fn(),
    };
    renderHook(() => useClipboardWatcher({ enabled: true, deps: [], onNewClip: onNew, existingClips: existing }));
    await advance(1500);
    (window as any).electronAPI.clipboard.readText.mockReturnValue('poller');
    await advance(1500);
  expect(clipService.addClip).toHaveBeenCalledWith('poller', expect.any(String));
  });
});
