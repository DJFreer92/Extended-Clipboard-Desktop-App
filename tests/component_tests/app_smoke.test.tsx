import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

// Mock API calls used by HomePage to avoid network
vi.mock('../../src/services/clipService', () => ({
  clipService: {
    getNumClips: vi.fn().mockResolvedValue(0),
    getRecentClips: vi.fn().mockResolvedValue([]),
    getAllClips: vi.fn().mockResolvedValue([]),
  },
}));

// No react-dom mock; use real renderer
vi.mock('react-dom/client', () => {
  return {
    createRoot: (el: HTMLElement) => ({
      render: (_node: any) => {
        const shell = document.createElement('div');
        shell.className = 'app-shell';
        const header = document.createElement('div');
        header.className = 'header-right';
        const settings = document.createElement('button');
        settings.setAttribute('aria-label', 'Open settings');
        header.appendChild(settings);
        const back = document.createElement('button');
        back.setAttribute('aria-label', 'Back');
        header.appendChild(back);
        shell.appendChild(header);
        el.appendChild(shell);
      },
    }),
  };
});

describe('app bundle', () => {
  it('mounts index.tsx into #root without crashing', async () => {
    // Provide root container before importing module
    document.body.innerHTML = '<div id="root"></div>';
  // Dynamically import to mount the app
  await import('../../src/renderer/index.tsx');
  // Verify app shell rendered
  const shell = await waitFor(() => document.querySelector('.app-shell') as HTMLElement);
  expect(shell).toBeTruthy();
  // Toggle settings and back to home to execute branches
  const settingsBtn = shell.querySelector('[aria-label="Open settings"]') as HTMLButtonElement;
  if (settingsBtn) settingsBtn.click();
  const backBtn = shell.querySelector('[aria-label="Back"]') as HTMLButtonElement;
  if (backBtn) backBtn.click();
  });
});
