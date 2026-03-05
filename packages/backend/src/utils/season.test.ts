import { describe, expect, test } from 'bun:test';
import { getSeasonYear } from './season.js';

describe('getSeasonYear', () => {
  // Note: getMonth() < 7 means Jan(0)-Jul(6) → previous year, Aug(7)-Dec(11) → current year

  test('August 2025 → season 2025 (new season starts)', () => {
    expect(getSeasonYear(new Date(2025, 7, 1))).toBe(2025); // month 7 = August
  });

  test('December 2025 → season 2025', () => {
    expect(getSeasonYear(new Date(2025, 11, 15))).toBe(2025);
  });

  test('January 2026 → season 2025', () => {
    expect(getSeasonYear(new Date(2026, 0, 10))).toBe(2025);
  });

  test('June 2026 → season 2025', () => {
    expect(getSeasonYear(new Date(2026, 5, 30))).toBe(2025);
  });

  test('July 2026 → still season 2025 (pre-season)', () => {
    expect(getSeasonYear(new Date(2026, 6, 1))).toBe(2025);
  });

  test('August 2026 → season 2026', () => {
    expect(getSeasonYear(new Date(2026, 7, 1))).toBe(2026);
  });

  test('no argument → returns current season', () => {
    const now = new Date();
    const expected = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
    expect(getSeasonYear()).toBe(expected);
  });
});
