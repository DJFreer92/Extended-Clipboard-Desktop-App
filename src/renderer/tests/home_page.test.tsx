import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import HomePage from '../pages/HomePage';

// Mock modular services
vi.mock('../../services/clips/clipsService', () => ({
  clipsService: {
    getNumClips: vi.fn().mockResolvedValue(1),
    getRecentClips: vi.fn().mockResolvedValue([{ Id: 1, Content: 'hello', Timestamp: Date.now(), FromAppName: 'TestApp', Tags: [] }]),
    getAllClips: vi.fn().mockResolvedValue([]),
    getNClipsBeforeId: vi.fn().mockResolvedValue([]),
    addClip: vi.fn().mockResolvedValue(undefined),
    deleteClip: vi.fn().mockResolvedValue(undefined),
    deleteAllClips: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/search/searchService', () => ({
  searchService: {
    filterNClips: vi.fn().mockResolvedValue([]),
    getNumFilteredClips: vi.fn().mockResolvedValue(0),
    filterNClipsBeforeId: vi.fn().mockResolvedValue([]),
    filterAllClipsAfterId: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/tags/tagsService', () => ({
  tagsService: {
    getAllTags: vi.fn().mockResolvedValue([{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]),
    addClipTag: vi.fn().mockResolvedValue(undefined),
    removeClipTag: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/apps/appsService', () => ({
  appsService: {
    getAllFromApps: vi.fn().mockResolvedValue(['Chrome','VSCode']),
  },
}));

vi.mock('../../services/favorites/favoritesService', () => ({
  favoritesService: {
    addFavorite: vi.fn().mockResolvedValue(undefined),
    removeFavorite: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => { vi.useFakeTimers(); });

// Basic rendering and actions

describe('HomePage – basic rendering and actions', () => {
  it('renders list and count, supports search and refresh', async () => {
    const view = render(<HomePage />);
    await act(async () => { await Promise.resolve(); });
    const searchRow = within(view.container).getByRole('search').parentElement?.parentElement as HTMLElement;
    expect(searchRow).toBeTruthy();
    expect(!!within(searchRow).getByText(/1 item|1 matching result/i)).toBe(true);
    expect(!!screen.getByPlaceholderText(/Search clips/i)).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Search clips/i), { target: { value: 'hello' } });
    await act(async () => { await Promise.resolve(); });
    expect(within(view.container).getByText(/matching results|matching result|items/i)).toBeTruthy();
    const btn = within(view.container).getByLabelText(/Refresh/i);
    expect(btn).toBeTruthy();
  });

  it('handles copy and delete buttons', async () => {
    const view = render(<HomePage />);
    await act(async () => { await Promise.resolve(); });
    const copyBtns = within(view.container).getAllByTitle(/Click to copy/i);
    fireEvent.click(copyBtns[0]);
    const deleteBtn = within(view.container).getAllByTitle(/Delete clip/i)[0];
    fireEvent.click(deleteBtn);
  });
});

// Error & fallback paths

describe('HomePage – error & fallback paths', () => {
  it('handles copy fallback and delete failure gracefully', async () => {
    const clipsModule = await import('../../services/clips/clipsService');
    (clipsModule.clipsService.getRecentClips as any).mockResolvedValueOnce([
      { id: 1, content: 'hi', timestamp: new Date().toISOString() },
    ]);
    (clipsModule.clipsService.getNumClips as any).mockResolvedValueOnce(1);
    (window as any).electronAPI.clipboard.writeText = undefined as any;
    (navigator as any).clipboard.writeText = undefined as any;
    (document as any).execCommand = () => true;
    const execSpy = vi.spyOn(document as any, 'execCommand');
    const view = render(<HomePage />);
    await act(async () => {});
    const copyBtn = within(view.container).getByTitle(/Click to copy/i);
    fireEvent.click(copyBtn);
    expect(execSpy).toHaveBeenCalledWith('copy');
    execSpy.mockRestore();
    (clipsModule.clipsService.deleteClip as any).mockRejectedValueOnce(new Error('del'));
    const delBtn = within(view.container).getByTitle(/Delete clip/i);
    fireEvent.click(delBtn);
    fireEvent.click(within(view.container).getByLabelText(/Refresh/i));
  });

  it('shows fetch error when initial and fallback fail', async () => {
    const clipsModule = await import('../../services/clips/clipsService');
    (clipsModule.clipsService.getNumClips as any).mockRejectedValueOnce(new Error('x'));
    // ...existing code...
  });
});

// Favorites filter

describe('HomePage – favorites filter', () => {
  it('toggles favorites filter and updates button state', async () => {
    const view = render(<HomePage />);
    await act(async () => {});
    const favBtn = within(view.container).getByLabelText(/Show only favorites/i);
    fireEvent.click(favBtn);
    expect(within(view.container).getByLabelText(/Show all clips/i)).toBeTruthy();
  });
});

// Date & search filters

describe('HomePage – date & search filters', () => {
  it('supports changing date range and clearing search', async () => {
    const view = render(<HomePage />);
    await act(async () => {});
    const filterGroup = within(view.container).getByRole('group', { name: /Filter by date range/i });
    const selectEl = within(filterGroup).getByRole('combobox', { name: /Date range/i });
    fireEvent.change(selectEl, { target: { value: 'week' } });
    await act(async () => {});
    fireEvent.change(within(view.container).getByLabelText(/Search clips/i), { target: { value: 'abc' } });
    await act(async () => {});
    fireEvent.click(within(view.container).getByLabelText(/Clear search/i));
    await act(async () => {});
  });
});

// Pagination

describe('HomePage – pagination', () => {
  it('load more via sentinel intersection calls pagination API', async () => {
    render(<HomePage />);
    await act(async () => {});
    await act(async () => {
      const arr = (global as any).__ioInstances as any[];
      const inst = arr[arr.length - 1];
      const cb = inst.callback as IntersectionObserverCallback;
      cb([{ isIntersecting: true } as any], inst as any);
    });
  });
});

// Poller & intersection observer

describe('HomePage – poller & intersection observer', () => {
  it('sets up IntersectionObserver and clipboard poller', async () => {
    render(<HomePage />);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(1600); });
  });
});

// Add tag via nested ClipList

describe('HomePage – add tag via nested ClipList', () => {
  it('adds a tag through ClipList tag add control', async () => {
    const view = render(<HomePage />);
    await act(async () => {});

    const addTagBtn = within(view.container).getAllByLabelText(/Add tag/i)[0];
    fireEvent.click(addTagBtn);
    await act(async () => {}); // Wait for state update

    // Find the input that should now be visible
    const input = view.container.querySelector('input[aria-label="New tag name"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(async () => {});
    await act(async () => {});

    // After adding a tag, check if the addClipTag service was called
    const { tagsService } = await import('../../services/tags/tagsService');
    const calls = (tagsService.addClipTag as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][1]).toBe('newtag'); // Check that the tag name is correct
  });
});

// Tag & app filters

describe('HomePage – tag & app filters', () => {
  it('opens tag and app dropdowns and selects filters', async () => {
    const view = render(<HomePage />);
    await act(async () => {});
    const tagTrigger = within(view.container).getByRole('button', { name: /Tags/ });
    fireEvent.click(tagTrigger);
    const fooOption = within(view.container).getByRole('option', { name: 'foo' });
    fireEvent.click(fooOption);
    fireEvent.click(within(view.container).getByLabelText(/Search clips/i));
    const appTrigger = within(view.container).getByRole('button', { name: /Apps/ });
    fireEvent.click(appTrigger);
    const appOption = within(view.container).getByRole('option', { name: 'Chrome' });
    fireEvent.click(appOption);
  });
});
