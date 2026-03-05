import type { LocationContext, WeatherContext } from './types.js';

export interface WeatherProvider {
  getForecast(kickoffIso: string, lat: number, lon: number): Promise<WeatherContext | null>;
  getHistorical(kickoffIso: string, lat: number, lon: number): Promise<WeatherContext | null>;
}

export interface LocationProvider {
  resolveVenue(
    venueName: string,
    league: string,
    country?: string,
  ): Promise<Pick<LocationContext, 'lat' | 'lon' | 'altitudeM' | 'timezone'> | null>;
}
