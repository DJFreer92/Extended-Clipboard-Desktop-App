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
      console.log(`Returning mock data for ${path}`);
      return getMockData(path) as T;
    }

    throw error;
  }
}

// Mock data for development when backend is not available
function getMockData(path: string): any {
  console.log(`Getting mock data for path: ${path}`);

  if (path.includes('/clipboard/get_recent_clips') || path.includes('/clipboard/get_all_clips')) {
    return {
      clips: [
        {
          id: 1,
          content: 'Hello World! This is a sample clip.',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          from_app_name: 'TextEdit',
          tags: ['sample', 'demo']
        },
        {
          id: 2,
          content: 'console.log("Another sample clip");',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
          from_app_name: 'VS Code',
          tags: ['code', 'javascript']
        },
        {
          id: 3,
          content: 'Extended Clipboard Desktop App - Mock Data',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          from_app_name: 'GitHub',
          tags: ['demo']
        }
      ]
    };
  }

  if (path.includes('/clipboard/get_num_clips') || path.includes('/clipboard/get_num_filtered_clips')) {
    return 3;
  }

  if (path.includes('/clipboard/get_all_tags')) {
    return [
      { id: 1, name: 'sample' },
      { id: 2, name: 'demo' },
      { id: 3, name: 'code' },
      { id: 4, name: 'javascript' }
    ];
  }

  if (path.includes('/clipboard/get_all_from_apps')) {
    return ['TextEdit', 'VS Code', 'GitHub', 'Chrome', 'Terminal'];
  }

  if (path.includes('/clipboard/filter_')) {
    return []; // Return empty for filtered results
  }

  // For other endpoints, return empty array or void
  return [];
}
