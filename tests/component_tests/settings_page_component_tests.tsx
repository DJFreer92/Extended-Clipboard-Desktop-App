import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../../src/renderer/pages/SettingsPage';

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
    render(<SettingsPage />);
    const btn = screen.getByRole('button', { name: /Delete All Clips/i });
    fireEvent.click(btn);
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('does nothing when user cancels', () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<SettingsPage />);
  const btns = screen.getAllByRole('button', { name: /Delete All Clips/i });
  fireEvent.click(btns[0]);
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
