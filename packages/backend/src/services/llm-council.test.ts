import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { __testing, runPredictionCouncil, type LlmMessage } from './llm-council.js';

const TestPredictionSchema = z.object({
  homeWinProb: z.number().min(0).max(100),
  drawProb: z.number().min(0).max(100),
  awayWinProb: z.number().min(0).max(100),
  overUnder25: z.enum(['over', 'under']),
  overUnder25Prob: z.number().min(0).max(100),
  btts: z.boolean(),
  bttsProb: z.number().min(0).max(100),
  predictedScore: z.string().regex(/^\d+-\d+$/),
  confidence: z.number().min(0).max(100),
  analysis: z.object({
    summary: z.string(),
    keyFactors: z.array(z.string()),
    homeStrengths: z.array(z.string()),
    awayStrengths: z.array(z.string()),
  }),
});

type TestPrediction = z.infer<typeof TestPredictionSchema>;

function makePrediction(partial: Partial<TestPrediction>): TestPrediction {
  return {
    homeWinProb: 50,
    drawProb: 25,
    awayWinProb: 25,
    overUnder25: 'over',
    overUnder25Prob: 56,
    btts: true,
    bttsProb: 54,
    predictedScore: '2-1',
    confidence: 70,
    analysis: {
      summary: 'Base',
      keyFactors: ['factor'],
      homeStrengths: ['home'],
      awayStrengths: ['away'],
    },
    ...partial,
  };
}

function jsonContent(payload: unknown): string {
  return JSON.stringify(payload);
}

function isDeciderMessage(messages: LlmMessage[]): boolean {
  return messages.some((m) => m.role === 'system' && m.content.includes('final decision-maker'));
}

describe('llm-council __testing helpers', () => {
  test('buildFallbackPrediction uses weighted confidence and normalizes 1X2', () => {
    const members = [
      {
        model: 'm1',
        parsedResult: makePrediction({ homeWinProb: 60, drawProb: 22, awayWinProb: 18, confidence: 80 }),
        rawResponse: '{}',
        durationMs: 100,
        attempts: 1,
      },
      {
        model: 'm2',
        parsedResult: makePrediction({ homeWinProb: 40, drawProb: 30, awayWinProb: 30, confidence: 40 }),
        rawResponse: '{}',
        durationMs: 100,
        attempts: 1,
      },
      {
        model: 'm3',
        parsedResult: makePrediction({ homeWinProb: 55, drawProb: 20, awayWinProb: 25, confidence: 65 }),
        rawResponse: '{}',
        durationMs: 100,
        attempts: 1,
      },
    ];

    const fallback = __testing.buildFallbackPrediction(members);
    const sum = fallback.prediction.homeWinProb + fallback.prediction.drawProb + fallback.prediction.awayWinProb;

    expect(sum).toBeCloseTo(100, 4);
    expect(fallback.prediction.homeWinProb).toBeGreaterThan(50);
    expect(fallback.prediction.confidence).toBeGreaterThan(20);
    expect(fallback.chosenScoreModel.length).toBeGreaterThan(0);
  });
});

describe('runPredictionCouncil', () => {
  test('uses decider output when quorum is met and decider succeeds', async () => {
    let anthropicCalls = 0;

    const result = await runPredictionCouncil<TestPrediction>({
      systemPrompt: 'System',
      userPrompt: 'User',
      matchMeta: {
        fixtureId: 1,
        homeTeam: 'Home',
        awayTeam: 'Away',
        leagueName: 'League',
      },
      validateResult: (value) => TestPredictionSchema.parse(value),
      modelCaller: async ({ model, messages }) => {
        if (model === 'anthropic/claude-opus-4.6') {
          anthropicCalls += 1;
          if (isDeciderMessage(messages)) {
            return {
              content: jsonContent(makePrediction({ predictedScore: '3-1', confidence: 82 })),
              attempts: 1,
            };
          }
          return {
            content: jsonContent(makePrediction({ predictedScore: '2-0', confidence: 75 })),
            attempts: 1,
          };
        }

        if (model === 'xai/grok-4') {
          return { content: jsonContent(makePrediction({ homeWinProb: 52, drawProb: 24, awayWinProb: 24 })), attempts: 1 };
        }

        if (model === 'google/gemini-3.1-pro-preview') {
          return { content: jsonContent(makePrediction({ homeWinProb: 49, drawProb: 27, awayWinProb: 24 })), attempts: 1 };
        }

        if (model === 'openai/gpt-5.2') {
          return { content: jsonContent(makePrediction({ homeWinProb: 51, drawProb: 25, awayWinProb: 24 })), attempts: 1 };
        }

        throw new Error(`Unexpected model ${model}`);
      },
    });

    expect(result.finalResult.predictedScore).toBe('3-1');
    expect(result.councilTrace.source).toBe('decider');
    expect(result.councilTrace.fallbackUsed).toBe(false);
    expect(result.councilTrace.successfulMembers).toBe(4);
    expect(anthropicCalls).toBe(2); // one member + one decider
  });

  test('falls back to deterministic aggregation when decider fails', async () => {
    const result = await runPredictionCouncil<TestPrediction>({
      systemPrompt: 'System',
      userPrompt: 'User',
      matchMeta: {
        fixtureId: 2,
        homeTeam: 'Home',
        awayTeam: 'Away',
        leagueName: 'League',
      },
      validateResult: (value) => TestPredictionSchema.parse(value),
      modelCaller: async ({ model, messages }) => {
        if (isDeciderMessage(messages)) {
          throw new Error('Decider timeout');
        }

        if (model === 'anthropic/claude-opus-4.6') {
          return { content: jsonContent(makePrediction({ homeWinProb: 63, drawProb: 21, awayWinProb: 16, confidence: 84 })), attempts: 1 };
        }

        if (model === 'xai/grok-4') {
          return { content: 'not-json', attempts: 1 };
        }

        if (model === 'google/gemini-3.1-pro-preview') {
          return { content: jsonContent(makePrediction({ homeWinProb: 57, drawProb: 24, awayWinProb: 19, confidence: 74 })), attempts: 1 };
        }

        if (model === 'openai/gpt-5.2') {
          return { content: jsonContent(makePrediction({ homeWinProb: 54, drawProb: 26, awayWinProb: 20, confidence: 67 })), attempts: 1 };
        }

        throw new Error(`Unexpected model ${model}`);
      },
    });

    const oneXtwoSum =
      result.finalResult.homeWinProb + result.finalResult.drawProb + result.finalResult.awayWinProb;

    expect(result.councilTrace.source).toBe('fallback');
    expect(result.councilTrace.fallbackUsed).toBe(true);
    expect(result.councilTrace.successfulMembers).toBe(3);
    expect(result.councilTrace.aggregation?.method).toBe('weighted_confidence_mean');
    expect(oneXtwoSum).toBeCloseTo(100, 4);
  });

  test('throws when quorum is not reached', async () => {
    await expect(
      runPredictionCouncil<TestPrediction>({
        systemPrompt: 'System',
        userPrompt: 'User',
        matchMeta: {
          fixtureId: 3,
          homeTeam: 'Home',
          awayTeam: 'Away',
          leagueName: 'League',
        },
        validateResult: (value) => TestPredictionSchema.parse(value),
        modelCaller: async ({ model }) => {
          if (model === 'anthropic/claude-opus-4.6') {
            return { content: jsonContent(makePrediction({ confidence: 70 })), attempts: 1 };
          }

          if (model === 'xai/grok-4') {
            return { content: jsonContent(makePrediction({ confidence: 65 })), attempts: 1 };
          }

          return { content: 'bad-json', attempts: 1 };
        },
      })
    ).rejects.toThrow('LLM council quorum not reached');
  });
});
