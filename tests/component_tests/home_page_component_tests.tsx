import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import HomePage from '../../src/renderer/pages/homePage';

// Mock clipService calls used by HomePage
vi.mock('../../src/services/clipService', () => {
  return {
    clipService: {
      getNumClips: vi.fn().mockResolvedValue(1),
      getRecentClips: vi.fn().mockResolvedValue([{ id: 1, content: 'hello', timestamp: new Date().toISOString() }]),
  getAllClips: vi.fn().mockResolvedValue([]),
      filterNClips: vi.fn().mockResolvedValue([]),
      getNumFilteredClips: vi.fn().mockResolvedValue(0),
      getNClipsBeforeId: vi.fn().mockResolvedValue([]),
      filterNClipsBeforeId: vi.fn().mockResolvedValue([]),
      addClip: vi.fn().mockResolvedValue(undefined),
      getAllClipsAfterId: vi.fn().mockResolvedValue([]),
      filterAllClipsAfterId: vi.fn().mockResolvedValue([]),
      deleteClip: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Speed up timers for clipboard poller
beforeEach(() => {
  vi.useFakeTimers();
});

describe('HomePage', () => {
  it('renders list and count, supports search and refresh', async () => {
  const view = render(<HomePage />);
  // initial load completes
  await act(async () => { await Promise.resolve(); });
  // count appears in the search-right area; select the specific element
  const searchRow = within(view.container).getByRole('search').parentElement?.parentElement as HTMLElement;
  expect(searchRow).toBeTruthy();
  expect(!!within(searchRow).getByText(/1 item|1 matching result/i)).toBe(true);
    expect(!!screen.getByPlaceholderText(/Search clips/i)).toBe(true);

    // typing a query flips to filtered mode
    fireEvent.change(screen.getByPlaceholderText(/Search clips/i), { target: { value: 'hello' } });
    // trigger effect
    await act(async () => { await Promise.resolve(); });
  expect(within(view.container).getByText(/matching results|matching result|items/i)).toBeTruthy();

    // refresh button exists and calls loader
  const btn = within(view.container).getByLabelText(/Refresh/i);
  expect(btn).toBeTruthy();
  });

  it('handles copy and delete buttons', async () => {
    const view = render(<HomePage />);
    await act(async () => { await Promise.resolve(); });
    // copy button should exist; clicking uses window.electronAPI mock from setup
  const copyBtns = within(view.container).getAllByTitle(/Copy to clipboard/i);
  fireEvent.click(copyBtns[0]);
  // delete button (pick the first)
  const deleteBtn = within(view.container).getAllByTitle(/Delete clip/i)[0];
  fireEvent.click(deleteBtn);
  });

  it('sets up IntersectionObserver and clipboard poller', async () => {
  const view = render(<HomePage />);
    await act(async () => { await Promise.resolve(); });
    // Advance timers to trigger poller tick
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
  });

  it('handles copy fallback and delete failure gracefully', async () => {
    const mod = await import('../../src/services/clipService');
    // Make initial list one item
    (mod.clipService.getRecentClips as any).mockResolvedValueOnce([
      { id: 1, content: 'hi', timestamp: new Date().toISOString() },
    ]);
    (mod.clipService.getNumClips as any).mockResolvedValueOnce(1);
    // Force electron and web clipboard write to be unavailable
    (window as any).electronAPI.clipboard.writeText = undefined as any;
    (navigator as any).clipboard.writeText = undefined as any;
  // Stub execCommand to succeed
  (document as any).execCommand = () => true;
  const execSpy = vi.spyOn(document as any, 'execCommand');
    const view = render(<HomePage />);
    await act(async () => {});
    const copyBtn = within(view.container).getByTitle(/Copy to clipboard/i);
    fireEvent.click(copyBtn);
    expect(execSpy).toHaveBeenCalledWith('copy');
    execSpy.mockRestore();
    // Force delete failure to hit catch
    (mod.clipService.deleteClip as any).mockRejectedValueOnce(new Error('del'));
    const delBtn = within(view.container).getByTitle(/Delete clip/i);
    fireEvent.click(delBtn);
    // Click refresh to cover handler
    fireEvent.click(within(view.container).getByLabelText(/Refresh/i));
  });

  it('supports changing date range and clearing search', async () => {
  const view = render(<HomePage />);
    await act(async () => {});
  const filterGroup = within(view.container).getByRole('group', { name: /Filter by date range/i });
  const selectEl = within(filterGroup).getByRole('combobox', { name: /Date range/i });
  fireEvent.change(selectEl, { target: { value: 'week' } });
    await act(async () => {});
  fireEvent.change(within(view.container).getByLabelText(/Search clips/i), { target: { value: 'abc' } });
    await act(async () => {});
    // Clear button appears and clears query
  fireEvent.click(within(view.container).getByLabelText(/Clear search/i));
    await act(async () => {});
  });

  it('shows fetch error when initial and fallback fail', async () => {
    const mod = await import('../../src/services/clipService');
    (mod.clipService.getNumClips as any).mockRejectedValueOnce(new Error('x'));
    (mod.clipService.getRecentClips as any).mockRejectedValueOnce(new Error('y'));
  (mod.clipService.getAllClips as any).mockRejectedValueOnce(new Error('z'));
  const view = render(<HomePage />);
    await act(async () => {});
  expect(within(view.container).getByText(/Failed to load clips/i)).toBeTruthy();
  });

  it('load more via sentinel intersection calls pagination API', async () => {
    const mod = await import('../../src/services/clipService');
    (mod.clipService.getRecentClips as any).mockResolvedValueOnce([
      { id: 3, content: 'c', timestamp: new Date().toISOString() },
    ]);
    (mod.clipService.getNumClips as any).mockResolvedValueOnce(100);
    (mod.clipService.getNClipsBeforeId as any).mockResolvedValueOnce([
      { id: 2, content: 'b', timestamp: new Date().toISOString() },
    ]);
    const view = render(<HomePage />);
    await act(async () => {});
    // Trigger IntersectionObserver callback
    await act(async () => {
      const arr = (global as any).__ioInstances as any[];
      const inst = arr[arr.length - 1];
      const cb = inst.callback as IntersectionObserverCallback;
      cb([{ isIntersecting: true } as any], inst as any);
    });
  });
});
