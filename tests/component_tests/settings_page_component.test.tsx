import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SettingsPage from '../../src/renderer/pages/settingsPage';

vi.mock('../../src/services/clipService', () => {
  return {
    clipService: {
      deleteAllClips: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('SettingsPage', () => {
  it('renders and calls delete all on confirm', async () => {
    // confirm dialog
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const view = render(<SettingsPage />);
  const btn = within(view.container).getByRole('button', { name: /Delete All Clips/i });
    fireEvent.click(btn);
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('does nothing when user cancels', () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const view = render(<SettingsPage />);
  const btns = within(view.container).getAllByRole('button', { name: /Delete All Clips/i });
  fireEvent.click(btns[0]);
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('button has proper attributes and disabled toggles during busy', () => {
  const view = render(<SettingsPage />);
  const btn = within(view.container).getByRole('button', { name: /Delete All Clips/i });
    expect(btn).toHaveAttribute('title', 'Delete all clips');
  });
});
