import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { AIMessage, ToolCall } from '@langchain/core/messages';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { getCurrentDate } from '../../agent/prompts.js';

/** Format snake_case tool name to Title Case for progress messages */
function formatSubToolName(name: string): string {
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Import all sports tools directly
import { getUpcomingMatches, getMatchResults } from './matches.js';
import { getTeamStats, searchTeam } from './team-stats.js';
import { getPlayerStats, searchPlayer, getTopScorers } from './player-stats.js';
import { getStandings } from './standings.js';
import { getHeadToHead } from './head-to-head.js';
import { getMatchOdds, getComparativeOdds } from './odds.js';
import { getInjuries } from './injuries.js';
import { getApiPredictions } from './predictions.js';

// All sports tools available for routing
const SPORTS_TOOLS: StructuredToolInterface[] = [
  // Match Data
  getUpcomingMatches,
  getMatchResults,
  // Team Data
  getTeamStats,
  searchTeam,
  // Player Data
  getPlayerStats,
  searchPlayer,
  getTopScorers,
  // Standings
  getStandings,
  // Head-to-Head
  getHeadToHead,
  // Odds & Predictions
  getMatchOdds,
  getComparativeOdds,
  getApiPredictions,
  // Injuries
  getInjuries,
];

// Quick lookup
const SPORTS_TOOL_MAP = new Map(SPORTS_TOOLS.map(t => [t.name, t]));

// Build the router system prompt
function buildRouterPrompt(): string {
  return `You are a sports data routing assistant for football/soccer analysis.
Current date: ${getCurrentDate()}

Given a user's natural language query about football data, call the appropriate sports tool(s).

## Guidelines

1. **Team Resolution**: Convert team names to API-Football team IDs when possible:
   - For well-known teams, use search_team first if you don't know the ID
   - Always try to resolve team names before calling other tools

2. **League IDs** (common leagues):
   - 39 = Premier League (England)
   - 140 = La Liga (Spain)
   - 78 = Bundesliga (Germany)
   - 135 = Serie A (Italy)
   - 61 = Ligue 1 (France)
   - 2 = Champions League
   - 3 = Europa League
   - 848 = Conference League
   - 4 = Euro Championship
   - 1 = World Cup

3. **Tool Selection**:
   - For upcoming fixtures → get_upcoming_matches
   - For past results → get_match_results
   - For team season statistics → get_team_stats (needs team_id + league_id)
   - For league table → get_standings
   - For direct comparisons → get_head_to_head (needs both team IDs)
   - For current injuries → get_injuries
   - For betting odds → get_match_odds (API-Football) or get_comparative_odds (multi-bookmaker)
   - For baseline predictions → get_api_predictions (needs fixture_id)
   - For player data → get_player_stats or search_player
   - For top scorers → get_top_scorers

4. **Match Prediction Workflow**: When predicting a match outcome, gather:
   - Team stats for both teams (get_team_stats)
   - Head-to-head history (get_head_to_head)
   - Current injuries (get_injuries for both teams)
   - League standings (get_standings)
   - Odds from bookmakers (get_match_odds or get_comparative_odds)
   - API predictions as baseline (get_api_predictions)

5. **Efficiency**:
   - Use search_team first when you need to resolve team names to IDs
   - Call multiple tools in parallel when possible
   - For comprehensive match analysis, call all relevant tools

Call the appropriate tool(s) now.`;
}

const SportsSearchInputSchema = z.object({
  query: z.string().describe('Natural language query about football/soccer data, matches, teams, players, odds, or predictions.'),
});

/**
 * Create a sports_search tool configured with the specified model.
 * Uses native LLM tool calling for routing queries to sports tools.
 */
export function createSportsSearch(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'sports_search',
    description: `Intelligent agentic search for football/soccer data. Takes a natural language query and automatically routes to appropriate sports data tools. Use for:
- Upcoming matches and fixtures
- Past match results and scores
- Team statistics and form
- Player statistics and search
- League standings and tables
- Head-to-head records
- Betting odds from multiple bookmakers
- Injury reports and suspensions
- Match predictions and analysis
- Top scorers and league statistics`,
    schema: SportsSearchInputSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      // 1. Call LLM with sports tools bound
      onProgress?.('Analyzing query...');
      const { response } = await callLlm(input.query, {
        model,
        systemPrompt: buildRouterPrompt(),
        tools: SPORTS_TOOLS,
      });
      const aiMessage = response as AIMessage;

      // 2. Check for tool calls
      const toolCalls = aiMessage.tool_calls as ToolCall[];
      if (!toolCalls || toolCalls.length === 0) {
        return formatToolResult({ error: 'No tools selected for query' }, []);
      }

      // 3. Execute tool calls in parallel
      const toolNames = toolCalls.map(tc => formatSubToolName(tc.name));
      onProgress?.(`Fetching from ${toolNames.join(', ')}...`);
      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          try {
            const tool = SPORTS_TOOL_MAP.get(tc.name);
            if (!tool) {
              throw new Error(`Tool '${tc.name}' not found`);
            }
            const rawResult = await tool.invoke(tc.args);
            const result = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
            const parsed = JSON.parse(result);
            return {
              tool: tc.name,
              args: tc.args,
              data: parsed.data,
              sourceUrls: parsed.sourceUrls || [],
              error: null,
            };
          } catch (error) {
            return {
              tool: tc.name,
              args: tc.args,
              data: null,
              sourceUrls: [],
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      // 4. Combine results
      const successfulResults = results.filter((r) => r.error === null);
      const failedResults = results.filter((r) => r.error !== null);
      const allUrls = results.flatMap((r) => r.sourceUrls);
      const combinedData: Record<string, unknown> = {};

      for (const result of successfulResults) {
        const teamId = (result.args as Record<string, unknown>).team_id as number | undefined;
        const key = teamId ? `${result.tool}_${teamId}` : result.tool;
        combinedData[key] = result.data;
      }

      if (failedResults.length > 0) {
        combinedData._errors = failedResults.map((r) => ({
          tool: r.tool,
          args: r.args,
          error: r.error,
        }));
      }

      return formatToolResult(combinedData, allUrls);
    },
  });
}
