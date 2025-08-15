import { describe, it, expect, vi } from "vitest";
import { formatTimeAMPM, formatRelative, formatFullDate, toDate, dateKey } from "../../../utils/date";

// Freeze time so relative calculations are deterministic
const NOW = new Date('2024-12-31T12:00:00Z');
vi.setSystemTime(NOW);

function daysAgo(n: number) {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

describe('date utils', () => {
  it('toDate handles primitives and Date', () => {
    const d = new Date();
    expect(toDate(d)).toBe(d);
    expect(toDate(d.toISOString()) instanceof Date).toBe(true);
    expect(toDate(d.getTime()) instanceof Date).toBe(true);
  });

  it('dateKey produces yyyy-m-d (timezone safe)', () => {
    // Use midday UTC to avoid local timezone shifting the calendar day
    const d = new Date('2024-01-05T12:00:00Z');
    expect(dateKey(d)).toBe('2024-1-5');
  });

  it('formatTimeAMPM covers midnight and noon wrapping', () => {
    expect(formatTimeAMPM(new Date('2024-01-01T00:05:00'))).toBe('12:05 AM');
    expect(formatTimeAMPM(new Date('2024-01-01T12:09:00'))).toBe('12:09 PM');
    expect(formatTimeAMPM(new Date('2024-01-01T23:59:00'))).toBe('11:59 PM');
  });

  it('formatRelative branches: Today & Yesterday', () => {
    expect(formatRelative(daysAgo(0))).toBe('Today');
    expect(formatRelative(daysAgo(1))).toBe('Yesterday');
  });

  it('formatRelative days < 7', () => {
    expect(formatRelative(daysAgo(2))).toBe('2 days ago');
    expect(formatRelative(daysAgo(6))).toBe('6 days ago');
  });

  it('formatRelative weeks', () => {
    expect(formatRelative(daysAgo(7))).toBe('1 week ago');
    expect(formatRelative(daysAgo(13))).toBe('1 week ago');
    expect(formatRelative(daysAgo(21))).toBe('3 weeks ago');
  });

  it('formatRelative months (under 12)', () => {
    expect(formatRelative(daysAgo(30))).toBe('1 month ago');
    expect(formatRelative(daysAgo(59))).toBe('1 month ago');
    expect(formatRelative(daysAgo(60))).toBe('2 months ago');
    expect(formatRelative(daysAgo(330))).toBe('11 months ago');
  });

  it('formatRelative years path (>= 365 days)', () => {
    expect(formatRelative(daysAgo(365))).toBe('1 year ago');
    expect(formatRelative(daysAgo(800))).toBe('2 years ago');
  });

  it('formatFullDate returns localized long form (smoke)', () => {
    const d = new Date('2024-06-15T00:00:00Z');
    expect(typeof formatFullDate(d)).toBe('string');
  });
});
