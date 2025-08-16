// Shared HTTP utility for all clipboard services

// In development, we rely on Vite dev proxy and use relative URLs to avoid CORS.
// In production, VITE_API_BASE_URL can be set to the absolute API origin.
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_BASE_URL || "";

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      // Ensure CORS preflight and cookies behave consistently in dev
      mode: (import.meta as any)?.env?.DEV ? 'cors' : init?.mode,
      credentials: init?.credentials ?? 'same-origin',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${path}${text ? `: ${text}` : ''}`);
    }

    // Some endpoints return no content (204/empty). Try JSON but tolerate empty.
    const ct = res.headers.get('content-type') || '';

    if (ct.includes('application/json')) {
      const jsonData = await res.json();
      return jsonData as T;
    }

    // For non-JSON responses, try to get text and see what we have
    const textData = await res.text();

    // If it's empty, return empty array for array endpoints
    if (!textData.trim()) {
      return [] as unknown as T;
    }

    return undefined as unknown as T;
  } catch (error) {
    console.warn(`API call failed for ${path}:`, error);

    // Return mock data for development when API is not available
    // Only provide mock data in dev mode and not during testing
    if ((import.meta as any)?.env?.DEV && !(import.meta as any)?.env?.VITEST) {
      const mockData = getMockData(path);
      return mockData as T;
    }

    throw error;
  }
}

// Mock data for development when backend is not available
function getMockData(path: string): any {
  if (path.includes('/clipboard/get_recent_clips') || path.includes('/clipboard/get_all_clips')) {
    return {
      clips: [
        {
          id: 1,
          content: 'Hello World! This is a sample clip with demo content.',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          from_app_name: 'TextEdit',
          tags: ['sample', 'demo'],
          is_favorite: false
        },
        {
          id: 2,
          content: 'console.log("Another sample clip with JavaScript code");',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
          from_app_name: 'VS Code',
          tags: ['code', 'javascript'],
          is_favorite: true
        },
        {
          id: 3,
          content: 'Extended Clipboard Desktop App - Mock Data for testing search',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          from_app_name: 'GitHub',
          tags: ['demo', 'testing'],
          is_favorite: false
        },
        {
          id: 4,
          content: 'git commit -m "Fix search functionality"',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
          from_app_name: 'Terminal',
          tags: ['git', 'code'],
          is_favorite: true
        }
      ]
    };
  }

  if (path.includes('/clipboard/get_num_clips')) {
    return 4; // Total number of mock clips
  }

  if (path.includes('/clipboard/get_num_filtered_clips')) {
    // Parse the search parameters to provide correct filtered count
    const url = new URL(`http://example.com${path}`);
    const searchParam = url.searchParams.get('search') || '';
    const favoritesOnly = url.searchParams.get('favorites_only') === 'true';
    const selectedTags = url.searchParams.getAll('selected_tags');
    const selectedApps = url.searchParams.getAll('selected_apps');

    // Base mock clips count
    let count = 4;

    // Apply same filtering logic as above to get accurate count
    const allMockClips = [
      { content: 'Hello World! This is a sample clip with demo content.', from_app_name: 'TextEdit', tags: ['sample', 'demo'], is_favorite: false },
      { content: 'console.log("Another sample clip with JavaScript code");', from_app_name: 'VS Code', tags: ['code', 'javascript'], is_favorite: true },
      { content: 'Extended Clipboard Desktop App - Mock Data for testing search', from_app_name: 'GitHub', tags: ['demo', 'testing'], is_favorite: false },
      { content: 'git commit -m "Fix search functionality"', from_app_name: 'Terminal', tags: ['git', 'code'], is_favorite: true }
    ];

    let filteredClips = allMockClips;

    // Filter by search term
    if (searchParam) {
      const searchTerms = searchParam.toLowerCase().split(/\s+/).filter(Boolean);
      filteredClips = filteredClips.filter(clip =>
        searchTerms.some(term =>
          clip.content.toLowerCase().includes(term) ||
          clip.from_app_name.toLowerCase().includes(term) ||
          clip.tags.some(tag => tag.toLowerCase().includes(term))
        )
      );
    }

    // Filter by favorites
    if (favoritesOnly) {
      filteredClips = filteredClips.filter(clip => clip.is_favorite);
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filteredClips = filteredClips.filter(clip =>
        selectedTags.some(tag => clip.tags.includes(tag))
      );
    }

    // Filter by selected apps
    if (selectedApps.length > 0) {
      filteredClips = filteredClips.filter(clip =>
        selectedApps.includes(clip.from_app_name)
      );
    }

    return filteredClips.length;
  }

  if (path.includes('/clipboard/get_all_tags')) {
    return [
      { id: 1, name: 'sample' },
      { id: 2, name: 'demo' },
      { id: 3, name: 'code' },
      { id: 4, name: 'javascript' },
      { id: 5, name: 'testing' },
      { id: 6, name: 'git' }
    ];
  }

  if (path.includes('/clipboard/get_all_from_apps')) {
    return ['TextEdit', 'VS Code', 'GitHub', 'Terminal', 'Chrome'];
  }

  if (path.includes('/clipboard/filter_')) {
    // Parse the search parameters to provide meaningful filtered mock data
    const url = new URL(`http://example.com${path}`);
    const searchParam = url.searchParams.get('search') || '';
    const favoritesOnly = url.searchParams.get('favorites_only') === 'true';
    const selectedTags = url.searchParams.getAll('selected_tags');
    const selectedApps = url.searchParams.getAll('selected_apps');

    // Base mock clips
    const allMockClips = [
      {
        id: 1,
        content: 'Hello World! This is a sample clip with demo content.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        from_app_name: 'TextEdit',
        tags: ['sample', 'demo'],
        is_favorite: false
      },
      {
        id: 2,
        content: 'console.log("Another sample clip with JavaScript code");',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        from_app_name: 'VS Code',
        tags: ['code', 'javascript'],
        is_favorite: true
      },
      {
        id: 3,
        content: 'Extended Clipboard Desktop App - Mock Data for testing search',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        from_app_name: 'GitHub',
        tags: ['demo', 'testing'],
        is_favorite: false
      },
      {
        id: 4,
        content: 'git commit -m "Fix search functionality"',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
        from_app_name: 'Terminal',
        tags: ['git', 'code'],
        is_favorite: true
      }
    ];

    // Apply filters
    let filteredClips = allMockClips;

    // Filter by search term
    if (searchParam) {
      const searchTerms = searchParam.toLowerCase().split(/\s+/).filter(Boolean);
      filteredClips = filteredClips.filter(clip =>
        searchTerms.some(term =>
          clip.content.toLowerCase().includes(term) ||
          clip.from_app_name.toLowerCase().includes(term) ||
          clip.tags.some(tag => tag.toLowerCase().includes(term))
        )
      );
    }

    // Filter by favorites
    if (favoritesOnly) {
      filteredClips = filteredClips.filter(clip => clip.is_favorite);
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filteredClips = filteredClips.filter(clip =>
        selectedTags.some(tag => clip.tags.includes(tag))
      );
    }

    // Filter by selected apps
    if (selectedApps.length > 0) {
      filteredClips = filteredClips.filter(clip =>
        selectedApps.includes(clip.from_app_name)
      );
    }

    return filteredClips;
  }

  // For other endpoints, return empty array or void
  return [];
}
