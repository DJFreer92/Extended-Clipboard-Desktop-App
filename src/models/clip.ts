// UI model for a clip used by the renderer
export interface ClipModel {
  Id: number;
  Content: string;
  Timestamp: number; // epoch ms for convenient sorting/formatting
  FromAppName: string | null;
  Tags: string[];
  IsFavorite?: boolean; // optional flag (may not be present in all API responses)
}

function parseTimestampMs(ts: string): number {
  if (!ts) return 0;

  // Handle pure numeric seconds or milliseconds in string form
  if (/^\d+$/.test(ts)) {
    const n = Number(ts);
    // If looks like seconds (10 digits), convert to ms
    if (ts.length <= 10 || n < 1e12) return n * 1000;
    return n;
  }

  // Parse ISO timestamp strings (expecting UTC format)
  // Date.parse() correctly handles UTC timestamps and converts them
  // to local time for JavaScript Date operations
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? 0 : ms;
}

export function fromApi(dto: { id: number; content: string; timestamp: string; from_app_name?: string | null; tags?: string[]; is_favorite?: boolean }): ClipModel {
  return {
    Id: dto.id,
    Content: String(dto.content ?? ""),
    Timestamp: parseTimestampMs(dto.timestamp),
    FromAppName: dto.from_app_name ?? null,
    Tags: Array.isArray(dto.tags) ? dto.tags.map(t => String(t)).sort() : [],
    IsFavorite: dto.is_favorite ?? false,
  };
}

export function toApi(model: ClipModel): { id: number; content: string; timestamp: string; from_app_name?: string | null; tags?: string[]; is_favorite?: boolean } {
  return {
    id: model.Id,
    content: model.Content,
    timestamp: new Date(model.Timestamp).toISOString(),
    from_app_name: model.FromAppName ?? undefined,
    tags: model.Tags && model.Tags.length ? model.Tags : undefined,
    is_favorite: model.IsFavorite ? true : undefined,
  };
}
