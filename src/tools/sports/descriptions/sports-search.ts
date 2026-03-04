/**
 * Rich description for the sports_search tool.
 * Used in the system prompt to guide the LLM on when and how to use this tool.
 */
export const SPORTS_SEARCH_DESCRIPTION = `
Intelligent meta-tool for football/soccer data research. Takes a natural language query and automatically routes to appropriate sports data sources including matches, team stats, player stats, standings, odds, injuries, and predictions.

## When to Use

- Upcoming matches and fixtures (by league, team, or date)
- Past match results and scores
- Team statistics and season form (wins, losses, goals, clean sheets)
- Player statistics (goals, assists, cards, ratings)
- League standings and tables (overall, home, away)
- Head-to-head records between two teams
- Betting odds from multiple bookmakers (1X2, Over/Under, BTTS)
- Injury reports and player suspensions
- Match predictions and win probabilities
- Top scorers and league statistics
- Value bet identification (comparing odds across bookmakers)

## When NOT to Use

- General web searches or non-sports topics (use web_search instead)
- Questions that don't require external sports data (answer directly from knowledge)
- Non-football sports data (currently football/soccer only)
- Historical data older than 5 seasons

## Usage Notes

- Call ONCE with the complete natural language query - the tool handles complexity internally
- For match predictions, pass queries like "predict Bayern vs Dortmund" - it gathers all relevant data
- Handles team name resolution automatically (e.g., "Bayern Munich" → team ID 157)
- Returns structured JSON data with source URLs for verification
- Common league IDs: 39=PL, 140=LaLiga, 78=Bundesliga, 135=SerieA, 61=Ligue1, 2=UCL
`.trim();
