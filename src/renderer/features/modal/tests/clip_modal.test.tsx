import { describe, it, expect } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import ClipList from '../../../components/ClipList';
import type { ClipModel } from '../../../../models/clip';

describe('ClipList – modal interactions', () => {
  it('opens modal on item expand and closes via X and overlay', async () => {
    const base = Date.now();
    const clip: ClipModel = { Id: 1, Content: 'A', Timestamp: base, FromAppName: '', Tags: [] };
    const view = render(<ClipList clips={[clip]} onCopy={() => {}} onDelete={() => {}} />);
    const firstClip = within(view.container).getByText('A').closest('li') as HTMLElement;
    fireEvent.click(within(firstClip).getByTitle(/Expand clip/i));
    expect(await within(view.container).findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(within(view.container).getByLabelText(/Close/i));
    expect(within(view.container).queryByRole('dialog')).toBeNull();
    fireEvent.click(within(firstClip).getByTitle(/Expand clip/i));
    const dlg = await within(view.container).findByRole('dialog');
    fireEvent.click(dlg);
    expect(within(view.container).queryByRole('dialog')).toBeNull();
  });
});
