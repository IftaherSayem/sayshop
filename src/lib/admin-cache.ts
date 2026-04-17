// Shared cache for admin statistics to prevent redundant heavy queries
export let statsCache: { data: any; timestamp: number } | null = null;
export const CACHE_TTL = 30 * 1000; // 30 seconds

export function invalidateStatsCache() {
  statsCache = null;
}

export function setStatsCache(data: any) {
  statsCache = { data, timestamp: Date.now() };
}

export function getStatsCache() {
  if (statsCache && (Date.now() - statsCache.timestamp < CACHE_TTL)) {
    return statsCache.data;
  }
  return null;
}
