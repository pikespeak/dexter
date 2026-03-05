import type { ContextEnrichment, LocationContext, WeatherContext } from './types.js';
import { config } from '../../config.js';

export function buildContextPlaceholders(): Pick<ContextEnrichment, 'weatherContext' | 'locationContext'> {
  const weatherEnabled = config.WEATHER_INTEL_ENABLED;
  const locationEnabled = config.LOCATION_INTEL_ENABLED;

  const weatherContext: WeatherContext = {
    status: weatherEnabled ? 'unavailable' : 'disabled',
    provider: weatherEnabled ? 'open-meteo (planned)' : undefined,
  };

  const locationContext: LocationContext = {
    status: locationEnabled ? 'unavailable' : 'disabled',
    provider: locationEnabled ? 'geocoder (planned)' : undefined,
  };

  return { weatherContext, locationContext };
}
