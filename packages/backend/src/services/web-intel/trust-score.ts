import type { EntityType, SourceType } from './types-internal.js';

const SOCIAL_DOMAINS = new Set([
  'x.com',
  'twitter.com',
  'reddit.com',
  'youtube.com',
  'instagram.com',
  'facebook.com',
  'tiktok.com',
]);

const OFFICIAL_DOMAINS = new Set([
  'fifa.com',
  'uefa.com',
  'premierleague.com',
  'laliga.com',
  'bundesliga.com',
  'ligue1.com',
  'legaseriea.it',
  'dfb.de',
  'thefa.com',
]);

const COACH_KEYWORDS = ['coach', 'manager', 'trainer', 'head coach', 'interim'];
const PLAYER_KEYWORDS = ['player', 'striker', 'midfielder', 'defender', 'goalkeeper'];

function domainMatches(domain: string, set: Set<string>): boolean {
  if (set.has(domain)) return true;
  for (const root of set) {
    if (domain.endsWith(`.${root}`)) return true;
  }
  return false;
}

export function classifySourceType(domain: string, leagueName: string): SourceType {
  const normalizedDomain = domain.toLowerCase();
  if (domainMatches(normalizedDomain, SOCIAL_DOMAINS)) return 'social';

  const normalizedLeague = leagueName.toLowerCase().replace(/\s+/g, '');
  if (domainMatches(normalizedDomain, OFFICIAL_DOMAINS) || normalizedDomain.includes(normalizedLeague)) {
    return 'official';
  }

  return 'news';
}

export function inferEntityType(text: string, homeTeam: string, awayTeam: string): EntityType {
  const normalized = text.toLowerCase();
  const homeMentioned = normalized.includes(homeTeam.toLowerCase());
  const awayMentioned = normalized.includes(awayTeam.toLowerCase());

  if (COACH_KEYWORDS.some((k) => normalized.includes(k))) return 'coach';
  if (PLAYER_KEYWORDS.some((k) => normalized.includes(k))) return 'player';
  if (homeMentioned && awayMentioned) return 'match';
  return 'club';
}

export function scoreSourceTrust(sourceType: SourceType, url: string, title: string): number {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();

  let score = sourceType === 'official' ? 1.0 : sourceType === 'news' ? 0.8 : 0.5;

  // Trusted weighting for social: keep all, but reward likely official/verified style handles.
  if (sourceType === 'social') {
    const trustedHints = ['official', 'club', 'fc', 'afc', 'cf', 'journalist', 'reporter'];
    if (trustedHints.some((hint) => lowerUrl.includes(hint) || lowerTitle.includes(hint))) {
      score += 0.2;
    }
  }

  return Math.max(0, Math.min(1, score));
}
