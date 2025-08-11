import { describe, expect, it } from 'vitest';
import { fromApi, toApi, type ClipModel } from '../../src/models/clip';

describe('clip model mapping', () => {
  it('fromApi maps fields and parses ISO timestamp', () => {
    const dto = { id: 1, content: 'hi', timestamp: '2024-01-01T00:00:00Z' };
    const model = fromApi(dto);
    expect(model.Id).toBe(1);
    expect(model.Content).toBe('hi');
    expect(typeof model.Timestamp).toBe('number');
  });

  it('fromApi handles numeric timestamp seconds and ms', () => {
    const sec = fromApi({ id: 1, content: 'x', timestamp: String(1700000000) });
    const ms = fromApi({ id: 1, content: 'x', timestamp: String(1700000001000) });
    expect(ms.Timestamp).toBeGreaterThan(sec.Timestamp);
  });

  it('toApi converts back to dto with ISO timestamp', () => {
    const model: ClipModel = { Id: 2, Content: 'yo', Timestamp: 1700000000000 };
    const dto = toApi(model);
    expect(dto.id).toBe(2);
    expect(dto.content).toBe('yo');
    expect(dto.timestamp).toMatch(/Z$/);
  });
});
