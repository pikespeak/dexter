import { describe, expect, test } from 'bun:test';
import { buildWebIntelQueries } from './query-builder.js';
import { applyWebIntelAdjustments, getContextEnrichment } from './index.js';
import type { WebIntel } from '../context-enrichment/types.js';

describe('web-intel query builder', () => {
  test('returns configured number of queries', () => {
    const queries = buildWebIntelQueries({
      homeTeam: 'Bayern Munich',
      awayTeam: 'Borussia Dortmund',
      leagueName: 'Bundesliga',
      maxQueries: 2,
    });

    expect(queries.length).toBe(2);
    expect(queries[0].includes('Bayern Munich')).toBe(true);
    expect(queries[0].includes('Borussia Dortmund')).toBe(true);
  });
});

describe('web-intel adjustments', () => {
  test('caps probability and confidence shifts', () => {
    const raw: Record<string, unknown> = {
      homeWinProb: 94,
      drawProb: 3,
      awayWinProb: 3,
      overUnder25Prob: 98,
      bttsProb: 1,
      confidence: 97,
      overUnder25: 'over',
      btts: false,
    };

    const webIntel: WebIntel = {
      summary: 'test',
      signals: ['signal'],
      sources: [
        {
          url: 'https://example.com/a',
          title: 'A',
          domain: 'example.com',
          sourceType: 'news',
          entityType: 'club',
          publishedAt: null,
          relevance: 0.8,
          sentiment: 0.1,
        },
      ],
      featureSnapshot: {
        availabilityHome: 90,
        availabilityAway: 88,
        lineupStabilityHome: 90,
        lineupStabilityAway: 88,
        coachChangeActiveHome: false,
        coachChangeActiveAway: false,
        sentimentIndexHome: 0.2,
        sentimentIndexAway: -0.1,
        controversyIndexHome: 0.1,
        controversyIndexAway: 0.1,
        restDaysHome: 4,
        restDaysAway: 3,
      },
      adjustments: {
        homeShift: 4,
        drawShift: 4,
        awayShift: 4,
        overUnderShift: 5,
        bttsShift: -5,
        confidenceShift: 5,
      },
    };

    applyWebIntelAdjustments(raw, webIntel);

    expect(Number(raw.homeWinProb)).toBeLessThanOrEqual(95);
    expect(Number(raw.drawProb)).toBeGreaterThanOrEqual(5);
    expect(Number(raw.awayWinProb)).toBeGreaterThanOrEqual(5);
    expect(Number(raw.overUnder25Prob)).toBeLessThanOrEqual(100);
    expect(Number(raw.bttsProb)).toBeGreaterThanOrEqual(0);
    expect(Number(raw.confidence)).toBeLessThanOrEqual(100);
  });
});

describe('context placeholders', () => {
  test('returns disabled weather/location context when flags are off', async () => {
    const result = await getContextEnrichment({
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      leagueName: 'Premier League',
    }, {
      enabled: false,
      apiKey: undefined,
      recencyHours: 72,
      maxQueries: 2,
      maxResults: 5,
      timeoutMs: 500,
    });

    expect(result.webIntel).toBeUndefined();
    expect(result.weatherContext?.status === 'disabled' || result.weatherContext?.status === 'unavailable').toBe(true);
    expect(result.locationContext?.status === 'disabled' || result.locationContext?.status === 'unavailable').toBe(true);
  });
});
