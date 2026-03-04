// Sports tools - football/soccer data and betting analysis
export { createSportsSearch } from './sports-search.js';
export { getUpcomingMatches, getMatchResults } from './matches.js';
export { getTeamStats, searchTeam } from './team-stats.js';
export { getPlayerStats, searchPlayer, getTopScorers } from './player-stats.js';
export { getStandings } from './standings.js';
export { getHeadToHead } from './head-to-head.js';
export { getMatchOdds, getComparativeOdds } from './odds.js';
export { getInjuries } from './injuries.js';
export { getApiPredictions } from './predictions.js';

// API clients
export { callFootballApi, callOddsApi } from './api.js';
