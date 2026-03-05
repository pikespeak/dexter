/**
 * Season Year Utility
 *
 * European football seasons span two calendar years (e.g., 2025/26).
 * API-Football uses the starting year (2025) as the season parameter.
 * From January through June, we need the previous year; from July onwards, current year.
 */

/**
 * Get the correct season year for API-Football requests.
 * Seasons start in July/August, so Jan-Jun belongs to the previous year's season.
 */
export function getSeasonYear(date?: Date): number {
  const d = date ?? new Date();
  return d.getMonth() < 7 ? d.getFullYear() - 1 : d.getFullYear();
}
