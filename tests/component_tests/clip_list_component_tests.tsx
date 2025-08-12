import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ClipList from '../../src/renderer/components/clipList';
import type { ClipModel } from '../../src/models/clip';

function mkClip(id: number, content: string, ts: number): ClipModel {
  return { Id: id, Content: content, Timestamp: ts };
}

describe('ClipList', () => {
  it('shows empty state when no clips', () => {
    render(<ClipList clips={[]} onCopy={() => {}} onDelete={() => {}} />);
  expect(!!screen.getByText(/No clips yet/i)).toBe(true);
  });

  it('shows "No results" when searching and list empty', () => {
    render(<ClipList clips={[]} onCopy={() => {}} onDelete={() => {}} isSearching />);
  expect(!!screen.getByText(/No results/i)).toBe(true);
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
  fireEvent.click(within(view.container).getAllByTitle(/Copy to clipboard/i)[0]);
    expect(onCopy).toHaveBeenCalled();
  fireEvent.click(within(view.container).getAllByTitle(/Delete clip/i)[0]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('opens modal on item click and closes via X and overlay', async () => {
    const base = Date.now();
    const clips = [mkClip(1, 'A', base)];
  const view = render(<ClipList clips={clips} onCopy={() => {}} onDelete={() => {}} />);
  const firstClip = within(view.container).getByText('A').closest('li') as HTMLElement;
  fireEvent.click(firstClip);
  expect(!!(await within(view.container).findByRole('dialog'))).toBe(true);
  fireEvent.click(within(view.container).getByLabelText(/Close/i));
  expect(within(view.container).queryByRole('dialog')).toBeNull();
  // open again and click overlay
  fireEvent.click(firstClip);
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
});
