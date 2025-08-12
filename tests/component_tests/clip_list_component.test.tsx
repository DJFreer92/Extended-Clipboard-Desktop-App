import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import ClipList from '../../src/renderer/components/clipList';
import type { ClipModel } from '../../src/models/clip';

// Mock dynamic clipService import used for tag add/remove and favorite toggling side-effects
vi.mock('../../src/services/clipService', () => {
  return {
    clipService: {
      addClipTag: vi.fn().mockResolvedValue(undefined),
      removeClipTag: vi.fn().mockResolvedValue(undefined),
      getAllTags: vi.fn().mockResolvedValue([{ id: 5, name: 'bar' }]),
    },
  };
});

const svcMod = () => import('../../src/services/clipService');

beforeEach(() => {
  vi.useRealTimers(); // default real timers; we'll rely on waitFor for async
});

function mkClip(id: number, content: string, ts: number): ClipModel {
  return { Id: id, Content: content, Timestamp: ts, FromAppName: '', Tags: [] };
}

describe('ClipList', () => {
  it('shows empty state when no clips', () => {
    render(<ClipList clips={[]} onCopy={() => {}} onDelete={() => {}} />);
  expect(screen.getByText(/No clips yet/i)).toBeInTheDocument();
  });

  it('shows "No results" when searching and list empty', () => {
    render(<ClipList clips={[]} onCopy={() => {}} onDelete={() => {}} isSearching />);
  expect(screen.getByText(/No results/i)).toBeInTheDocument();
  });

  it('groups clips by date and renders items', () => {
    const base = new Date('2024-01-01T10:00:00Z').getTime();
    const clips = [mkClip(1, 'A', base), mkClip(2, 'B', base + 60_000), mkClip(3, 'C', base + 24*3600*1000)];
  const view = render(<ClipList clips={clips} onCopy={() => {}} onDelete={() => {}} />);
  // Three clip items
  const clipLis = view.container.querySelectorAll('li.clip-item');
  expect(clipLis.length).toBe(3);
  // Two date groups
  const groupToggles = view.container.querySelectorAll('button.group-toggle');
  expect(groupToggles.length).toBe(2);
  // Collapse first group
  groupToggles[0] && fireEvent.click(groupToggles[0]);
  });

  it('invokes copy and delete handlers', () => {
    const base = Date.now();
    const clips = [mkClip(1, 'A', base)];
    const onCopy = vi.fn();
    const onDelete = vi.fn();
  const view = render(<ClipList clips={clips} onCopy={onCopy} onDelete={onDelete} />);
  // Click the list item (title "Click to copy") to copy
  fireEvent.click(within(view.container).getAllByTitle(/Click to copy/i)[0]);
    expect(onCopy).toHaveBeenCalled();
  fireEvent.click(within(view.container).getAllByTitle(/Delete clip/i)[0]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('opens modal on item click and closes via X and overlay', async () => {
    const base = Date.now();
    const clips = [mkClip(1, 'A', base)];
  const view = render(<ClipList clips={clips} onCopy={() => {}} onDelete={() => {}} />);
  const firstClip = within(view.container).getByText('A').closest('li') as HTMLElement;
  // Open via expand button (list item click copies, not opens modal)
  fireEvent.click(within(firstClip).getByTitle(/Expand clip/i));
  expect(await within(view.container).findByRole('dialog')).toBeInTheDocument();
  fireEvent.click(within(view.container).getByLabelText(/Close/i));
  expect(within(view.container).queryByRole('dialog')).toBeNull();
  // open again and click overlay
  fireEvent.click(within(firstClip).getByTitle(/Expand clip/i));
  const dlg = await within(view.container).findByRole('dialog');
    fireEvent.click(dlg);
  expect(within(view.container).queryByRole('dialog')).toBeNull();
  });

  it('sets data-time attribute using AM/PM format', () => {
    const morning = new Date('2024-01-01T09:05:00');
    const clips = [mkClip(1, 'A', +morning)];
    const view = render(<ClipList clips={clips} onCopy={() => {}} onDelete={() => {}} />);
    const li = view.container.querySelector('li.clip-item') as HTMLElement;
    expect(li.getAttribute('data-time')).toMatch(/AM|PM/);
  });

  it('adds a tag via TagAddControl and calls service + callback', async () => {
    const base = Date.now();
    const clip: ClipModel = { Id: 10, Content: 'X', Timestamp: base, FromAppName: null, Tags: [] };
    const onTagAdded = vi.fn();
    const view = render(<ClipList clips={[clip]} onCopy={() => {}} onDelete={() => {}} onTagAdded={onTagAdded} />);
    const addBtn = within(view.container).getByLabelText(/Add tag/i);
    fireEvent.click(addBtn);
    const input = within(view.container).getByLabelText(/New tag name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'foo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
  // wait for callback and UI update
  await waitFor(() => expect(onTagAdded).toHaveBeenCalledWith('foo'));
  // UI re-render for new tag isn't forced (mutates clip object); skip asserting DOM presence
  const mod = await svcMod();
  expect(mod.clipService.addClipTag).toHaveBeenCalledWith(10, 'foo');
  });

  it('removes a tag and calls removeClipTag after resolving id', async () => {
    const base = Date.now();
    const clip: ClipModel = { Id: 11, Content: 'Y', Timestamp: base, FromAppName: null, Tags: ['bar'] };
    const view = render(<ClipList clips={[clip]} onCopy={() => {}} onDelete={() => {}} />);
    const removeBtn = within(view.container).getByLabelText(/Remove tag bar/i);
    fireEvent.click(removeBtn);
  const mod = await svcMod();
  await waitFor(() => expect(mod.clipService.removeClipTag).toHaveBeenCalled());
  // tag badge should be gone after optimistic update
  expect(within(view.container).queryByText('bar')).toBeNull();
  expect(mod.clipService.removeClipTag).toHaveBeenCalledWith(11, 5);
  });

  it('collapses tags into ellipsis and expands to show all', async () => {
    const base = Date.now();
    // First long tag plus a second triggers ellipsis threshold logic
    const clip: ClipModel = { Id: 12, Content: 'Z', Timestamp: base, FromAppName: null, Tags: ['abcdefghijk', 'secondtag', 'third'] };
    const view = render(<ClipList clips={[clip]} onCopy={() => {}} onDelete={() => {}} />);
    const ellipsis = within(view.container).getByTitle(/Show all tags/i);
    expect(ellipsis).toBeTruthy();
    // Only first tag visible initially
    expect(within(view.container).queryByText('secondtag')).toBeNull();
    fireEvent.click(ellipsis);
    await Promise.resolve();
    expect(within(view.container).getByText('secondtag')).toBeTruthy();
  });

  it('toggles favorite via list and modal without triggering copy', async () => {
    const base = Date.now();
    const clip: ClipModel = { Id: 13, Content: 'Fav Clip', Timestamp: base, FromAppName: null, Tags: [], IsFavorite: false };
    const onCopy = vi.fn();
    const onToggleFavorite = vi.fn();
    const view = render(<ClipList clips={[clip]} onCopy={onCopy} onDelete={() => {}} onToggleFavorite={onToggleFavorite} />);
  const favBtn = within(view.container).getAllByTitle(/Favorite/i)[0];
    fireEvent.click(favBtn);
    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ Id: 13 }));
    expect(onCopy).not.toHaveBeenCalled();
    // Open modal and toggle there (modal updates internal state so aria-label flips)
    const expandBtn = within(view.container).getByTitle(/Expand clip/i);
    fireEvent.click(expandBtn);
  const modalFav = await within(view.container).findAllByTitle(/Favorite/i);
  fireEvent.click(modalFav[1]);
  expect(onToggleFavorite).toHaveBeenCalledTimes(2);
  // After click, aria-label should now be Unfavorite (in modal)
  await waitFor(() => expect(within(view.container).getAllByLabelText(/Unfavorite clip/i).length).toBeGreaterThan(0));
  });
});
