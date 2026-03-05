import { config } from '../../config.js';
import { OpenMeteoLocationProvider, OpenMeteoWeatherProvider } from './open-meteo.js';
import type { ContextEnrichment, LocationContext, WeatherContext } from './types.js';

const WEATHER_PROVIDER_NAME = 'open-meteo';
const LOCATION_PROVIDER_NAME = 'open-meteo geocoding';

export interface ContextEnrichmentRuntimeConfig {
  weatherEnabled: boolean;
  locationEnabled: boolean;
  weatherTimeoutMs: number;
  locationTimeoutMs: number;
}

export interface LocationWeatherInput {
  kickoff?: Date;
  leagueName: string;
  venue?: string;
  country?: string;
}

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function resolveRuntimeConfig(
  overrides?: Partial<ContextEnrichmentRuntimeConfig>,
): ContextEnrichmentRuntimeConfig {
  return {
    weatherEnabled: config.WEATHER_INTEL_ENABLED,
    locationEnabled: config.LOCATION_INTEL_ENABLED,
    weatherTimeoutMs: config.WEATHER_INTEL_TIMEOUT_MS,
    locationTimeoutMs: config.LOCATION_INTEL_TIMEOUT_MS,
    ...overrides,
  };
}

function parseZonedDateParts(date: Date, timezone: string): ZonedDateParts | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const year = Number.parseInt(partMap.year ?? '', 10);
    const month = Number.parseInt(partMap.month ?? '', 10);
    const day = Number.parseInt(partMap.day ?? '', 10);
    const hour = Number.parseInt(partMap.hour ?? '', 10);
    const minute = Number.parseInt(partMap.minute ?? '', 10);
    const second = Number.parseInt(partMap.second ?? '', 10);

    if ([year, month, day, hour, minute, second].some((v) => Number.isNaN(v))) {
      return null;
    }

    return { year, month, day, hour, minute, second };
  } catch {
    return null;
  }
}

function getTimezoneDiffHours(kickoff: Date, timezone?: string): number | undefined {
  if (!timezone) return undefined;
  const parts = parseZonedDateParts(kickoff, timezone);
  if (!parts) return undefined;

  const zonedAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return round((zonedAsUtcMs - kickoff.getTime()) / (60 * 60 * 1000), 2);
}

function getKickoffLocalHour(kickoff: Date, timezone?: string): number | undefined {
  if (!timezone) return undefined;
  const parts = parseZonedDateParts(kickoff, timezone);
  if (!parts) return undefined;
  return parts.hour;
}

function chooseWeatherMode(kickoff: Date): 'forecast' | 'historical' {
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return kickoff.getTime() <= Date.now() - twoHoursMs ? 'historical' : 'forecast';
}

export function buildContextPlaceholders(
  runtimeOverrides?: Partial<ContextEnrichmentRuntimeConfig>,
): Pick<ContextEnrichment, 'weatherContext' | 'locationContext'> {
  const runtime = resolveRuntimeConfig(runtimeOverrides);

  const weatherContext: WeatherContext = {
    status: runtime.weatherEnabled ? 'unavailable' : 'disabled',
    provider: runtime.weatherEnabled ? WEATHER_PROVIDER_NAME : undefined,
  };

  const locationContext: LocationContext = {
    status: runtime.locationEnabled ? 'unavailable' : 'disabled',
    provider: runtime.locationEnabled ? LOCATION_PROVIDER_NAME : undefined,
  };

  return { weatherContext, locationContext };
}

export async function buildLocationAndWeatherContext(
  input: LocationWeatherInput,
  runtimeOverrides?: Partial<ContextEnrichmentRuntimeConfig>,
): Promise<Pick<ContextEnrichment, 'weatherContext' | 'locationContext'>> {
  const runtime = resolveRuntimeConfig(runtimeOverrides);
  const context = buildContextPlaceholders(runtime);

  if (!runtime.locationEnabled && !runtime.weatherEnabled) {
    return context;
  }

  const venueName = input.venue?.trim();
  if (!venueName) {
    return context;
  }

  const locationProvider = new OpenMeteoLocationProvider({ timeoutMs: runtime.locationTimeoutMs });
  const weatherProvider = new OpenMeteoWeatherProvider({ timeoutMs: runtime.weatherTimeoutMs });

  let resolvedLocation: Awaited<ReturnType<typeof locationProvider.resolveVenue>> = null;

  try {
    resolvedLocation = await locationProvider.resolveVenue(venueName, input.leagueName, input.country);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[ContextEnrichment] location resolution failed: ${message}`);
  }

  if (runtime.locationEnabled) {
    if (resolvedLocation) {
      context.locationContext = {
        status: 'available',
        provider: LOCATION_PROVIDER_NAME,
        lat: round(resolvedLocation.lat, 6),
        lon: round(resolvedLocation.lon, 6),
        altitudeM: resolvedLocation.altitudeM !== undefined ? round(resolvedLocation.altitudeM, 1) : undefined,
        timezone: resolvedLocation.timezone,
        timezoneDiffHours: input.kickoff
          ? getTimezoneDiffHours(input.kickoff, resolvedLocation.timezone)
          : undefined,
        kickoffLocalHour: input.kickoff
          ? getKickoffLocalHour(input.kickoff, resolvedLocation.timezone)
          : undefined,
      };
    } else {
      context.locationContext = {
        status: 'unavailable',
        provider: LOCATION_PROVIDER_NAME,
      };
    }
  }

  if (!runtime.weatherEnabled) {
    return context;
  }

  if (!input.kickoff || !resolvedLocation) {
    context.weatherContext = {
      status: 'unavailable',
      provider: WEATHER_PROVIDER_NAME,
    };
    return context;
  }

  const kickoffIso = input.kickoff.toISOString();
  const mode = chooseWeatherMode(input.kickoff);

  try {
    const primary = mode === 'historical'
      ? await weatherProvider.getHistorical(kickoffIso, resolvedLocation.lat, resolvedLocation.lon)
      : await weatherProvider.getForecast(kickoffIso, resolvedLocation.lat, resolvedLocation.lon);

    if (primary) {
      context.weatherContext = primary;
      return context;
    }

    // Fallback for edge windows where one endpoint might not return data yet.
    const fallback = mode === 'historical'
      ? await weatherProvider.getForecast(kickoffIso, resolvedLocation.lat, resolvedLocation.lon)
      : await weatherProvider.getHistorical(kickoffIso, resolvedLocation.lat, resolvedLocation.lon);

    context.weatherContext = fallback ?? {
      status: 'unavailable',
      provider: WEATHER_PROVIDER_NAME,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[ContextEnrichment] weather lookup failed: ${message}`);
    context.weatherContext = {
      status: 'unavailable',
      provider: WEATHER_PROVIDER_NAME,
    };
  }

  return context;
}
