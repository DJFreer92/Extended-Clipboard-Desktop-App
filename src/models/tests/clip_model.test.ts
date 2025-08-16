import { describe, expect, it } from 'vitest';
import { fromApi, toApi, type ClipModel } from '../clip';

describe('clip model mapping', () => {
  it('fromApi maps fields and parses ISO timestamp incl app name, tags & favorite', () => {
    const dto = { id: 1, content: 'hi', timestamp: '2024-01-01T00:00:00Z', from_app_name: 'Chrome', tags: ['a','b'], is_favorite: true } as any;
    const model = fromApi(dto);
    expect(model.Id).toBe(1);
    expect(model.Content).toBe('hi');
    expect(model.FromAppName).toBe('Chrome');
    expect(model.Tags).toEqual(['a','b']);
    expect(model.IsFavorite).toBe(true);
    expect(typeof model.Timestamp).toBe('number');
  });

  it('fromApi handles numeric timestamp seconds and ms', () => {
    const sec = fromApi({ id: 1, content: 'x', timestamp: String(1700000000) });
    const ms = fromApi({ id: 1, content: 'x', timestamp: String(1700000001000) });
    expect(ms.Timestamp).toBeGreaterThan(sec.Timestamp);
  });

  it('toApi converts back to dto with ISO timestamp and optional fields including favorite', () => {
    const model: ClipModel = { Id: 2, Content: 'yo', Timestamp: 1700000000000, FromAppName: 'VSCode', Tags: ['x'], IsFavorite: true };
    const dto = toApi(model);
    expect(dto.id).toBe(2);
    expect(dto.content).toBe('yo');
    expect(dto.timestamp).toMatch(/Z$/);
    expect(dto.from_app_name).toBe('VSCode');
    expect(dto.tags).toEqual(['x']);
    expect(dto.is_favorite).toBe(true);
  });

  it('toApi omits empty tags and false favorite', () => {
    const model: ClipModel = { Id: 3, Content: 'omit', Timestamp: 1700000000000, FromAppName: null, Tags: [], IsFavorite: false };
    const dto = toApi(model);
    expect(dto.tags).toBeUndefined();
    expect(dto.is_favorite).toBeUndefined();
  });

  it('fromApi handles empty and invalid timestamp strings', () => {
    const empty = fromApi({ id: 1, content: 'x', timestamp: '' as any });
    const invalid = fromApi({ id: 1, content: 'x', timestamp: 'not-a-date' as any });
    expect(empty.Timestamp).toBe(0);
    expect(invalid.Timestamp).toBe(0);
  });
});
