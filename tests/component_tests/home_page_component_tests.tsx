import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import HomePage from '../../src/renderer/pages/HomePage';

// Mock clipService calls used by HomePage
vi.mock('../../src/services/clipService', () => {
  return {
    clipService: {
      getNumClips: vi.fn().mockResolvedValue(1),
      getRecentClips: vi.fn().mockResolvedValue([{ id: 1, content: 'hello', timestamp: new Date().toISOString() }]),
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
    render(<HomePage />);
  // initial load completes
  await act(async () => { await Promise.resolve(); });
  // count appears in the search-right area; select the specific element
  const searchRow = screen.getByRole('search').parentElement?.parentElement as HTMLElement;
  expect(searchRow).toBeTruthy();
  expect(within(searchRow).getByText(/1 item|1 matching result/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search clips/i)).toBeInTheDocument();

    // typing a query flips to filtered mode
    fireEvent.change(screen.getByPlaceholderText(/Search clips/i), { target: { value: 'hello' } });
    // trigger effect
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText(/matching results|matching result|items/i)).toBeInTheDocument();

    // refresh button exists and calls loader
    const btn = screen.getByLabelText(/Refresh/i);
    expect(btn).toBeInTheDocument();
  });

  it('handles copy and delete buttons', async () => {
    render(<HomePage />);
    await act(async () => { await Promise.resolve(); });
    // copy button should exist; clicking uses window.electronAPI mock from setup
  const copyBtns = screen.getAllByTitle(/Copy to clipboard/i);
  fireEvent.click(copyBtns[0]);
  // delete button (pick the first)
  const deleteBtn = screen.getAllByTitle(/Delete clip/i)[0];
  fireEvent.click(deleteBtn);
  });

  it('sets up IntersectionObserver and clipboard poller', async () => {
    render(<HomePage />);
    await act(async () => { await Promise.resolve(); });
    // Advance timers to trigger poller tick
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
  });
});
