import { z } from 'zod';

export const SourceTypeSchema = z.enum(['news', 'official', 'social']);
export const EntityTypeSchema = z.enum(['match', 'club', 'player', 'coach']);
export const ContextStatusSchema = z.enum(['disabled', 'unavailable', 'available']);

export const WebSourceMetadataSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  domain: z.string().min(1),
  sourceType: SourceTypeSchema,
  entityType: EntityTypeSchema,
  publishedAt: z.string().min(1).nullable(),
  relevance: z.number().min(0).max(1),
  sentiment: z.number().min(-1).max(1),
});

export const WebFeatureSnapshotSchema = z.object({
  availabilityHome: z.number().min(0).max(100),
  availabilityAway: z.number().min(0).max(100),
  lineupStabilityHome: z.number().min(0).max(100),
  lineupStabilityAway: z.number().min(0).max(100),
  coachChangeActiveHome: z.boolean(),
  coachChangeActiveAway: z.boolean(),
  sentimentIndexHome: z.number().min(-1).max(1),
  sentimentIndexAway: z.number().min(-1).max(1),
  controversyIndexHome: z.number().min(0).max(1),
  controversyIndexAway: z.number().min(0).max(1),
  restDaysHome: z.number().min(0).max(14),
  restDaysAway: z.number().min(0).max(14),
});

export const WebAdjustmentSchema = z.object({
  homeShift: z.number().min(-4).max(4),
  drawShift: z.number().min(-4).max(4),
  awayShift: z.number().min(-4).max(4),
  overUnderShift: z.number().min(-5).max(5),
  bttsShift: z.number().min(-5).max(5),
  confidenceShift: z.number().min(-10).max(5),
});

export const WebIntelSchema = z.object({
  summary: z.string().min(1),
  signals: z.array(z.string()).max(12),
  sources: z.array(WebSourceMetadataSchema).max(5),
  featureSnapshot: WebFeatureSnapshotSchema,
  adjustments: WebAdjustmentSchema,
});

export const WeatherContextSchema = z.object({
  status: ContextStatusSchema,
  provider: z.string().optional(),
  temperatureC: z.number().optional(),
  precipMm: z.number().optional(),
  windKph: z.number().optional(),
  humidityPct: z.number().optional(),
  weatherSeverityIndex: z.number().min(0).max(1).optional(),
  weatherUncertainty: z.number().min(0).max(1).optional(),
});

export const LocationContextSchema = z.object({
  status: ContextStatusSchema,
  provider: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  altitudeM: z.number().optional(),
  timezone: z.string().optional(),
  timezoneDiffHours: z.number().optional(),
  travelDistanceKm: z.number().optional(),
  kickoffLocalHour: z.number().min(0).max(23).optional(),
});

export const ContextEnrichmentSchema = z.object({
  webIntel: WebIntelSchema.optional(),
  weatherContext: WeatherContextSchema.optional(),
  locationContext: LocationContextSchema.optional(),
});

export type WebSourceMetadata = z.infer<typeof WebSourceMetadataSchema>;
export type WebFeatureSnapshot = z.infer<typeof WebFeatureSnapshotSchema>;
export type WebAdjustment = z.infer<typeof WebAdjustmentSchema>;
export type WebIntel = z.infer<typeof WebIntelSchema>;
export type WeatherContext = z.infer<typeof WeatherContextSchema>;
export type LocationContext = z.infer<typeof LocationContextSchema>;
export type ContextEnrichment = z.infer<typeof ContextEnrichmentSchema>;
