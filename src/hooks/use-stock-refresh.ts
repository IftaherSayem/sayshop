'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface StockInfo {
  stock: number
  updatedAt: number
}

interface UseStockRefreshOptions {
  /** Auto-refresh interval in milliseconds (default: 30000). Set 0 to disable. */
  pollInterval?: number
  /** Only poll when the component is visible (default: true) */
  useVisibilityObserver?: boolean
}

interface UseStockRefreshReturn {
  /** Map of productId -> current stock info */
  stockMap: Map<string, StockInfo>
  /** Whether stock data is currently being fetched */
  isLoading: boolean
  /** Last fetch error, if any */
  error: string | null
  /** Manually trigger a stock refresh */
  refresh: () => Promise<void>
  /** Timestamp of last successful fetch */
  lastUpdated: Date | null
}

export function useStockRefresh(
  productIds: string[],
  options: UseStockRefreshOptions = {}
): UseStockRefreshReturn {
  const { pollInterval = 30000, useVisibilityObserver = true } = options

  const [stockMap, setStockMap] = useState<Map<string, StockInfo>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const isVisibleRef = useRef(true)
  const mountedRef = useRef(true)
  const idsRef = useRef(productIds)

  // Keep the ref in sync
  useEffect(() => {
    idsRef.current = productIds
  }, [productIds])

  const fetchStock = useCallback(async () => {
    const ids = idsRef.current
    if (ids.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        ids: ids.join(','),
        limit: String(ids.length),
      })
      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch stock data')

      const data = await res.json()
      const products = data.products || []

      if (!mountedRef.current) return

      const now = Date.now()
      const newMap = new Map<string, StockInfo>()
      for (const product of products) {
        newMap.set(product.id, {
          stock: product.stock,
          updatedAt: now,
        })
      }

      setStockMap(newMap)
      setLastUpdated(new Date(now))
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to refresh stock')
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  // Initial fetch when productIds change
  useEffect(() => {
    if (productIds.length > 0) {
      fetchStock()
    }
  }, [productIds.length, fetchStock, productIds.join(',')])

  // Auto-refresh polling
  useEffect(() => {
    if (pollInterval <= 0 || productIds.length === 0) return

    const interval = setInterval(() => {
      if (isVisibleRef.current && mountedRef.current) {
        fetchStock()
      }
    }, pollInterval)

    return () => clearInterval(interval)
  }, [pollInterval, productIds.length, fetchStock])

  // Visibility observer
  useEffect(() => {
    if (!useVisibilityObserver) return

    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [useVisibilityObserver])

  // IntersectionObserver for element visibility
  useEffect(() => {
    if (!useVisibilityObserver) return

    const el = document.documentElement
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
      },
      { threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [useVisibilityObserver])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    stockMap,
    isLoading,
    error,
    refresh: fetchStock,
    lastUpdated,
  }
}
