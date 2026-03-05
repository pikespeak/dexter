export type SourceType = 'news' | 'official' | 'social';
export type EntityType = 'match' | 'club' | 'player' | 'coach';

export interface TavilyResultItem {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedAt: string | null;
}

export interface NormalizedWebResult extends TavilyResultItem {
  domain: string;
  sourceType: SourceType;
  entityType: EntityType;
  trust: number;
  relevance: number;
  sentiment: number;
  text: string;
}
