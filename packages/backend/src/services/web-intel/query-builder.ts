export interface WebIntelQueryInput {
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  maxQueries: number;
}

function normalizeTeamName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

export function buildWebIntelQueries(input: WebIntelQueryInput): string[] {
  const home = normalizeTeamName(input.homeTeam);
  const away = normalizeTeamName(input.awayTeam);
  const league = input.leagueName.trim();

  const candidates = [
    `${home} vs ${away} ${league} injury suspension lineup coach press conference news`,
    `${home} ${away} manager trainer team news rotation morale doubtful players`,
    `${home} ${away} local journalist update social reactions match preview`,
  ];

  return candidates.slice(0, Math.max(1, Math.min(input.maxQueries, candidates.length)));
}
