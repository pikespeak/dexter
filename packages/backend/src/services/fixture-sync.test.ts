import { describe, expect, test } from 'bun:test';
import {
  buildHistoricalSeasonSlices,
  mapFixtureStatus,
  parseLeagueIdsCsv,
  shouldUpdateMatch,
  splitDateRange,
} from './fixture-sync.js';

describe('mapFixtureStatus', () => {
  test('maps known statuses to internal statuses', () => {
    expect(mapFixtureStatus('NS')).toBe('scheduled');
    expect(mapFixtureStatus('TBD')).toBe('scheduled');
    expect(mapFixtureStatus('1H')).toBe('live');
    expect(mapFixtureStatus('LIVE')).toBe('live');
    expect(mapFixtureStatus('FT')).toBe('finished');
    expect(mapFixtureStatus('PST')).toBe('postponed');
    expect(mapFixtureStatus('CANC')).toBe('cancelled');
    expect(mapFixtureStatus('ABD')).toBe('abandoned');
  });

  test('falls back to unknown for unsupported statuses', () => {
    expect(mapFixtureStatus('AWD')).toBe('unknown');
    expect(mapFixtureStatus()).toBe('unknown');
  });
});

describe('shouldUpdateMatch', () => {
  const existing = {
    id: 'm1',
    apiFootballId: 1001,
    homeTeam: 'Bayern',
    homeTeamId: 157,
    awayTeam: 'Dortmund',
    awayTeamId: 165,
    leagueName: 'Bundesliga',
    leagueId: 78,
    kickoff: new Date('2026-03-06T19:30:00.000Z'),
    venue: 'Allianz Arena',
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
  };

  const incoming = {
    apiFootballId: 1001,
    homeTeam: 'Bayern',
    homeTeamId: 157,
    awayTeam: 'Dortmund',
    awayTeamId: 165,
    leagueName: 'Bundesliga',
    leagueId: 78,
    kickoff: new Date('2026-03-06T19:30:00.000Z'),
    venue: 'Allianz Arena',
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
  };

  test('returns false when no fields changed', () => {
    expect(shouldUpdateMatch(existing, incoming)).toBe(false);
  });

  test('returns true when kickoff or venue changed', () => {
    expect(
      shouldUpdateMatch(existing, {
        ...incoming,
        kickoff: new Date('2026-03-06T20:00:00.000Z'),
      })
    ).toBe(true);

    expect(
      shouldUpdateMatch(existing, {
        ...incoming,
        venue: 'Olympiastadion',
      })
    ).toBe(true);
  });

  test('returns true when status or scores changed', () => {
    expect(
      shouldUpdateMatch(existing, {
        ...incoming,
        status: 'finished',
        homeScore: 2,
        awayScore: 1,
      })
    ).toBe(true);
  });
});

describe('parseLeagueIdsCsv', () => {
  test('parses unique numeric ids from CSV', () => {
    expect(parseLeagueIdsCsv('39,140,39, 78')).toEqual([39, 140, 78]);
  });

  test('ignores invalid values', () => {
    expect(parseLeagueIdsCsv('abc, , -1, 61')).toEqual([61]);
  });
});

describe('splitDateRange', () => {
  test('splits a range into fixed day chunks', () => {
    const chunks = splitDateRange(
      new Date('2022-01-01T10:00:00.000Z'),
      new Date('2022-01-10T18:00:00.000Z'),
      3
    );

    expect(chunks.length).toBe(4);
    expect(chunks[0].from.toISOString()).toBe('2022-01-01T00:00:00.000Z');
    expect(chunks[0].to.toISOString()).toBe('2022-01-03T23:59:59.999Z');
    expect(chunks[3].from.toISOString()).toBe('2022-01-10T00:00:00.000Z');
    expect(chunks[3].to.toISOString()).toBe('2022-01-10T23:59:59.999Z');
  });
});

describe('buildHistoricalSeasonSlices', () => {
  test('creates season-overlap chunks only', () => {
    const slices = buildHistoricalSeasonSlices(
      new Date('2022-01-01T00:00:00.000Z'),
      new Date('2022-12-31T23:59:59.999Z'),
      [2021, 2022, 2023],
      30
    );

    expect(slices.length).toBeGreaterThan(0);
    const seasons = Array.from(new Set(slices.map((slice) => slice.season))).sort();
    expect(seasons).toEqual([2021, 2022]);
  });
});
