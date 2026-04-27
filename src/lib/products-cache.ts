
// Simple memory cache for product listings
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const cache = new Map<string, { data: any; expiry: number }>()

export function getProductsCache(key: string) {
  const item = cache.get(key)
  if (!item) return null
  if (Date.now() > item.expiry) {
    cache.delete(key)
    return null
  }
  return item.data
}

export function setProductsCache(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL })
  // Prune cache if it gets too large
  if (cache.size > 1000) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
}

export function clearProductsCache() {
  cache.clear()
}
