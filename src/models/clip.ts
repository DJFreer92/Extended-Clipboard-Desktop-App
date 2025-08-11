// UI model for a clip used by the renderer
export interface ClipModel {
  Id: number;
  Content: string;
  Timestamp: number; // epoch ms for convenient sorting/formatting
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
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? 0 : ms;
}

export function fromApi(dto: { id: number; content: string; timestamp: string }): ClipModel {
  return {
    Id: dto.id,
    Content: String(dto.content ?? ""),
    Timestamp: parseTimestampMs(dto.timestamp),
  };
}

export function toApi(model: ClipModel): { id: number; content: string; timestamp: string } {
  return {
    id: model.Id,
    content: model.Content,
    timestamp: new Date(model.Timestamp).toISOString(),
  };
}
