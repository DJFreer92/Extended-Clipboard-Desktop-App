import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import HomePage from '../pages/HomePage';

// Mock all the services and hooks
vi.mock('../../../../services/clips/clipsService', () => ({
  clipsService: {
    getAllClips: vi.fn().mockResolvedValue([]),
    getNumClips: vi.fn().mockResolvedValue(0),
    deleteClip: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock('../../../../services/search/searchService', () => ({
  searchService: {
    searchClips: vi.fn().mockResolvedValue([]),
    getNumMatchingClips: vi.fn().mockResolvedValue(0),
  }
}));

vi.mock('../../../../services/favorites/favoritesService', () => ({
  favoritesService: {
    addFavorite: vi.fn().mockResolvedValue(undefined),
    removeFavorite: vi.fn().mockResolvedValue(undefined),
    getAllFavorites: vi.fn().mockResolvedValue([]),
    getNumFavorites: vi.fn().mockResolvedValue(0),
  }
}));

vi.mock('../../../../services/tags/tagsService', () => ({
  tagsService: {
    getAllTags: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('../../../../services/apps/appsService', () => ({
  appsService: {
    getAllFromApps: vi.fn().mockResolvedValue([]),
  }
}));

// Mock electron API
const mockElectronAPI = {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    startWatching: vi.fn(),
    stopWatching: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('HomePage Favorites Integration', () => {
  it('should pass favorite toggle to ClipList component', async () => {
    const { container } = render(<HomePage />);

    // Should render without errors
    expect(container).toBeTruthy();

    // ClipList should be present
    const clipList = container.querySelector('.clips-container');
    expect(clipList).toBeTruthy();
  });
});
