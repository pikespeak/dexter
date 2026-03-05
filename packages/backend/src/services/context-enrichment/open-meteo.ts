import { createHash } from 'crypto';
import { z } from 'zod';
import { cacheGet, cacheSet } from '../cache.js';
import type { LocationProvider, WeatherProvider } from './providers.js';
import type { WeatherContext } from './types.js';

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const HOURLY_FIELDS = 'temperature_2m,precipitation,wind_speed_10m,relative_humidity_2m';

const GEOCODE_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const FORECAST_CACHE_TTL_SECONDS = 4 * 60 * 60;
const HISTORICAL_CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;

interface ProviderOptions {
  timeoutMs: number;
}

interface GeocodingPoint {
  lat: number;
  lon: number;
  altitudeM?: number;
  timezone?: string;
}

interface WeatherSample {
  temperatureC?: number;
  precipMm?: number;
  windKph?: number;
  humidityPct?: number;
}

const GeocodingResultSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  timezone: z.string().optional(),
  country: z.string().optional(),
  admin1: z.string().optional(),
});

const GeocodingResponseSchema = z.object({
  results: z.array(GeocodingResultSchema).optional(),
});

const WeatherHourlySchema = z.object({
  time: z.array(z.string()).default([]),
  temperature_2m: z.array(z.union([z.number(), z.null()])).optional(),
  precipitation: z.array(z.union([z.number(), z.null()])).optional(),
  wind_speed_10m: z.array(z.union([z.number(), z.null()])).optional(),
  relative_humidity_2m: z.array(z.union([z.number(), z.null()])).optional(),
});

const WeatherResponseSchema = z.object({
  hourly: WeatherHourlySchema,
});

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildCacheKey(scope: string, canonical: string): string {
  const digest = createHash('sha1').update(canonical).digest('hex').slice(0, 16);
  return `context:${scope}:${digest}`;
}

async function fetchJson(url: URL, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      const payload = details ? `${response.status} ${response.statusText} - ${details}` : `${response.status} ${response.statusText}`;
      throw new Error(`request failed: ${payload}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function scoreCandidate(
  candidate: z.infer<typeof GeocodingResultSchema>,
  venueName: string,
  country?: string,
): number {
  const venueLower = venueName.toLowerCase();
  const candidateNameLower = candidate.name.toLowerCase();

  let score = 0;
  if (candidateNameLower === venueLower) score += 4;
  if (candidateNameLower.includes(venueLower) || venueLower.includes(candidateNameLower)) score += 2;

  const venueTokens = venueLower.split(/\s+/).filter((token) => token.length >= 4);
  for (const token of venueTokens) {
    if (candidateNameLower.includes(token)) score += 0.4;
  }

  if (country && candidate.country?.toLowerCase() === country.toLowerCase()) {
    score += 2;
  }

  if (candidate.admin1) score += 0.1;
  return score;
}

function parseOpenMeteoTimestamp(raw: string): number {
  const hasZone = /([+-]\d{2}:\d{2}|Z)$/.test(raw);
  const normalized = hasZone ? raw : `${raw}Z`;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
}

function getNumberAt(series: Array<number | null> | undefined, index: number): number | undefined {
  const value = series?.[index];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function pickNearestSample(hourly: z.infer<typeof WeatherHourlySchema>, kickoffIso: string): WeatherSample | null {
  const kickoffTs = Date.parse(kickoffIso);
  if (Number.isNaN(kickoffTs)) return null;

  let nearestIndex = -1;
  let nearestDeltaMs = Number.POSITIVE_INFINITY;

  for (let idx = 0; idx < hourly.time.length; idx += 1) {
    const timestamp = parseOpenMeteoTimestamp(hourly.time[idx]);
    if (Number.isNaN(timestamp)) continue;

    const deltaMs = Math.abs(timestamp - kickoffTs);
    if (deltaMs < nearestDeltaMs) {
      nearestDeltaMs = deltaMs;
      nearestIndex = idx;
    }
  }

  if (nearestIndex < 0) return null;
  if (nearestDeltaMs > 3 * 60 * 60 * 1000) return null;

  const sample: WeatherSample = {
    temperatureC: getNumberAt(hourly.temperature_2m, nearestIndex),
    precipMm: getNumberAt(hourly.precipitation, nearestIndex),
    windKph: getNumberAt(hourly.wind_speed_10m, nearestIndex),
    humidityPct: getNumberAt(hourly.relative_humidity_2m, nearestIndex),
  };

  const hasAnyValue =
    sample.temperatureC !== undefined ||
    sample.precipMm !== undefined ||
    sample.windKph !== undefined ||
    sample.humidityPct !== undefined;

  return hasAnyValue ? sample : null;
}

function calculateWeatherSeverity(sample: WeatherSample): number {
  let severity = 0;

  if (sample.precipMm !== undefined) {
    severity += clamp(sample.precipMm / 4.5, 0, 1) * 0.5;
  }

  if (sample.windKph !== undefined) {
    severity += clamp((sample.windKph - 20) / 35, 0, 1) * 0.3;
  }

  if (sample.temperatureC !== undefined) {
    const coldImpact = sample.temperatureC < 0 ? clamp((0 - sample.temperatureC) / 8, 0, 1) : 0;
    const heatImpact = sample.temperatureC > 30 ? clamp((sample.temperatureC - 30) / 10, 0, 1) : 0;
    severity += Math.max(coldImpact, heatImpact) * 0.15;
  }

  if (sample.humidityPct !== undefined) {
    severity += clamp((sample.humidityPct - 90) / 10, 0, 1) * 0.05;
  }

  return round(clamp(severity, 0, 1), 3);
}

function calculateForecastUncertainty(kickoffIso: string): number {
  const kickoffTs = Date.parse(kickoffIso);
  if (Number.isNaN(kickoffTs)) return 0.5;

  const hoursAhead = Math.max(0, (kickoffTs - Date.now()) / (60 * 60 * 1000));
  return round(clamp(0.12 + (hoursAhead / 220), 0.12, 0.75), 3);
}

function weatherProviderLabel(mode: 'forecast' | 'historical'): string {
  return mode === 'forecast' ? 'open-meteo forecast' : 'open-meteo archive';
}

function toWeatherContext(sample: WeatherSample, mode: 'forecast' | 'historical', kickoffIso: string): WeatherContext {
  return {
    status: 'available',
    provider: weatherProviderLabel(mode),
    temperatureC: sample.temperatureC !== undefined ? round(sample.temperatureC, 1) : undefined,
    precipMm: sample.precipMm !== undefined ? round(sample.precipMm, 1) : undefined,
    windKph: sample.windKph !== undefined ? round(sample.windKph, 1) : undefined,
    humidityPct: sample.humidityPct !== undefined ? round(sample.humidityPct, 1) : undefined,
    weatherSeverityIndex: calculateWeatherSeverity(sample),
    weatherUncertainty: mode === 'forecast' ? calculateForecastUncertainty(kickoffIso) : 0.06,
  };
}

export class OpenMeteoLocationProvider implements LocationProvider {
  private readonly timeoutMs: number;

  constructor(options: ProviderOptions) {
    this.timeoutMs = options.timeoutMs;
  }

  async resolveVenue(
    venueName: string,
    _league: string,
    country?: string,
  ): Promise<Pick<GeocodingPoint, 'lat' | 'lon' | 'altitudeM' | 'timezone'> | null> {
    const normalizedVenue = venueName.trim();
    if (!normalizedVenue) return null;

    const canonical = `${normalizedVenue.toLowerCase()}|${(country ?? '').toLowerCase()}`;
    const cacheKey = buildCacheKey('geocode', canonical);
    const cached = await cacheGet<GeocodingPoint>(cacheKey);
    if (cached && typeof cached.lat === 'number' && typeof cached.lon === 'number') {
      return cached;
    }

    const url = new URL(GEOCODING_BASE_URL);
    url.searchParams.set('name', country ? `${normalizedVenue}, ${country}` : normalizedVenue);
    url.searchParams.set('count', '8');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const raw = await fetchJson(url, this.timeoutMs);
    const parsed = GeocodingResponseSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.results || parsed.data.results.length === 0) {
      return null;
    }

    const best = [...parsed.data.results]
      .sort((a, b) => scoreCandidate(b, normalizedVenue, country) - scoreCandidate(a, normalizedVenue, country))[0];

    const result: GeocodingPoint = {
      lat: best.latitude,
      lon: best.longitude,
      altitudeM: best.elevation,
      timezone: best.timezone,
    };

    await cacheSet(cacheKey, result, GEOCODE_CACHE_TTL_SECONDS);
    return result;
  }
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  private readonly timeoutMs: number;

  constructor(options: ProviderOptions) {
    this.timeoutMs = options.timeoutMs;
  }

  async getForecast(kickoffIso: string, lat: number, lon: number): Promise<WeatherContext | null> {
    return this.fetchWeather('forecast', kickoffIso, lat, lon);
  }

  async getHistorical(kickoffIso: string, lat: number, lon: number): Promise<WeatherContext | null> {
    return this.fetchWeather('historical', kickoffIso, lat, lon);
  }

  private async fetchWeather(
    mode: 'forecast' | 'historical',
    kickoffIso: string,
    lat: number,
    lon: number,
  ): Promise<WeatherContext | null> {
    const kickoffTs = Date.parse(kickoffIso);
    if (Number.isNaN(kickoffTs)) return null;

    if (mode === 'forecast') {
      const hoursAhead = (kickoffTs - Date.now()) / (60 * 60 * 1000);
      if (hoursAhead > 17 * 24) {
        return null;
      }
    }

    const kickoffDate = new Date(kickoffTs).toISOString().slice(0, 10);
    const roundedLat = round(lat, 4);
    const roundedLon = round(lon, 4);

    const cacheKey = buildCacheKey(
      `weather:${mode}`,
      `${kickoffIso}|${roundedLat}|${roundedLon}`,
    );

    const cached = await cacheGet<WeatherContext>(cacheKey);
    if (cached?.status === 'available') {
      return cached;
    }

    const baseUrl = mode === 'forecast' ? FORECAST_BASE_URL : ARCHIVE_BASE_URL;
    const url = new URL(baseUrl);
    url.searchParams.set('latitude', String(roundedLat));
    url.searchParams.set('longitude', String(roundedLon));
    url.searchParams.set('hourly', HOURLY_FIELDS);
    url.searchParams.set('start_date', kickoffDate);
    url.searchParams.set('end_date', kickoffDate);
    url.searchParams.set('timezone', 'UTC');

    const raw = await fetchJson(url, this.timeoutMs);
    const parsed = WeatherResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return null;
    }

    const sample = pickNearestSample(parsed.data.hourly, kickoffIso);
    if (!sample) {
      return null;
    }

    const weatherContext = toWeatherContext(sample, mode, kickoffIso);
    await cacheSet(
      cacheKey,
      weatherContext,
      mode === 'forecast' ? FORECAST_CACHE_TTL_SECONDS : HISTORICAL_CACHE_TTL_SECONDS,
    );

    return weatherContext;
  }
}
