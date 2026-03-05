import { describe, expect, test } from 'bun:test';
import { parseLeagueIdParam } from './matches.js';

describe('parseLeagueIdParam', () => {
  test('parses valid league ids', () => {
    expect(parseLeagueIdParam('39')).toBe(39);
    expect(parseLeagueIdParam('78')).toBe(78);
  });

  test('returns null for invalid values', () => {
    expect(parseLeagueIdParam(null)).toBeNull();
    expect(parseLeagueIdParam(undefined)).toBeNull();
    expect(parseLeagueIdParam('')).toBeNull();
    expect(parseLeagueIdParam('abc')).toBeNull();
  });
});
