// Applications management service for clips
import { http } from '../shared/http';

export const appsService = {
  // Applications list (distinct from_app_name values)
  async getAllFromApps(): Promise<string[]> {
    try {
      // Endpoint returns a raw JSON array of strings: ["Safari", ...]
      const data = await http<any>(`/clipboard/get_all_from_apps`);
      if (Array.isArray(data)) return data.filter(a => typeof a === 'string' && a.trim().length).map(a => a.trim());
      // Backward compatibility if server ever wraps
      if (data && Array.isArray((data as any).apps)) return (data as any).apps.filter((a: any) => typeof a === 'string' && a.trim().length).map((a: string) => a.trim());
      return [];
    } catch (e) {
      console.error('Failed to fetch apps list', e);
      return [];
    }
  },
};
