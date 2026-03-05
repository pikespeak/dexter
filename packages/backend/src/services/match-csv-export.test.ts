import { describe, expect, test } from 'bun:test';
import { __testing } from './match-csv-export.js';

describe('match-csv-export helpers', () => {
  test('csvEscape escapes commas, quotes, and newlines', () => {
    const escaped = __testing.csvEscape('hello, "world"\nline');
    expect(escaped).toBe('"hello, ""world""\nline"');
  });

  test('rowToCsvLine produces comma-separated RFC4180 line', () => {
    const line = __testing.rowToCsvLine({
      schema_version: 'v1',
      match_id: 'm1',
      api_football_id: 1,
      prediction_id: 'p1',
      prediction_version_id: 'pv1',
      version_no: 2,
      model_version: 'council-v1',
      tier: 'pro',
      league_id: 39,
      league_name: 'Premier League',
      home_team: 'Arsenal',
      away_team: 'Liverpool',
      kickoff_utc: '2026-03-05T12:00:00.000Z',
      match_status: 'finished',
      system_prompt: 'S',
      user_prompt: 'U',
      prompt_hash: 'abc',
      council_source: 'decider',
      fallback_used: false,
      council_disagreement: 10.5,
      member_models_json: '[]',
      member_results_raw_json: '[]',
      member_results_parsed_json: '[]',
      decider_model: 'anthropic/claude-opus-4.6',
      decider_raw_json: '{}',
      decider_parsed_json: '{}',
      usage_json: '{}',
      llm_call_costs_json: '[]',
      llm_costs_by_model_json: '[]',
      llm_total_cost_usd: '0.123456',
      llm_total_cost_source: 'estimated',
      llm_total_cost_complete: true,
      home_win_prob: '52.11',
      draw_prob: '24.12',
      away_win_prob: '23.77',
      over_under_25: 'over',
      over_under_25_prob: '58.00',
      btts: true,
      btts_prob: '55.00',
      predicted_score: '2-1',
      confidence: '72.00',
      final_prediction_json: '{}',
      actual_home_score: 2,
      actual_away_score: 1,
      actual_result: '2-1',
      predicted_outcome: 'home',
      was_correct: true,
      brier_score: 0.142,
      ou_correct: true,
      btts_correct: true,
      exact_score_correct: true,
      predicted_at_utc: '2026-03-05T08:00:00.000Z',
      evaluated_at_utc: '2026-03-05T15:00:00.000Z',
      hours_to_kickoff: 4,
      value_bets_json: '[]',
      value_bets_versioned: false,
      has_web_intel: true,
      has_injuries: true,
      has_council: true,
      has_prompt_context: true,
      has_odds: false,
    });

    expect(line.split(',').length).toBeGreaterThan(40);
    expect(line.includes('Arsenal')).toBe(true);
  });

  test('getPredictedOutcome picks max probability', () => {
    expect(__testing.getPredictedOutcome(60, 20, 20)).toBe('home');
    expect(__testing.getPredictedOutcome(30, 40, 30)).toBe('draw');
    expect(__testing.getPredictedOutcome(30, 20, 50)).toBe('away');
  });

  test('computeHoursToKickoff returns fractional hours', () => {
    const predictedAt = new Date('2026-03-05T08:00:00.000Z');
    const kickoffAt = new Date('2026-03-05T14:30:00.000Z');
    expect(__testing.computeHoursToKickoff(predictedAt, kickoffAt)).toBe(6.5);
  });

  test('extractCouncilFields tolerates missing council trace', () => {
    const fields = __testing.extractCouncilFields(null);
    expect(fields.source).toBeNull();
    expect(fields.memberModels).toEqual([]);
    expect(fields.memberRaw).toEqual([]);
    expect(fields.memberParsed).toEqual([]);
    expect(fields.totalCostUsd).toBeNull();
    expect(fields.callCosts).toEqual([]);
  });

  test('extractCouncilFields computes per-call and total model costs', () => {
    const fields = __testing.extractCouncilFields({
      source: 'decider',
      fallbackUsed: false,
      memberModels: ['openai/gpt-5.2', 'xai/grok-4'],
      members: [
        {
          model: 'openai/gpt-5.2',
          usage: {
            promptTokens: 1500,
            completionTokens: 500,
          },
        },
        {
          model: 'xai/grok-4',
          usage: {
            totalCostUsd: 0.015,
            promptTokens: 1200,
            completionTokens: 800,
          },
        },
      ],
      deciderModel: 'anthropic/claude-opus-4.6',
      deciderUsage: {
        promptTokens: 1000,
        completionTokens: 400,
      },
    });

    expect(fields.callCosts.length).toBe(3);
    expect(fields.totalCostUsd).not.toBeNull();
    expect(fields.totalCostUsd!).toBeGreaterThan(0);
    expect(['reported', 'estimated', 'mixed', 'partial']).toContain(fields.totalCostSource);
    expect(fields.costsByModel.length).toBeGreaterThanOrEqual(2);
  });
});
