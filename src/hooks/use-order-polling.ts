'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Order } from '@/lib/types'

interface UseOrderPollingOptions {
  /** Poll interval in milliseconds (default: 30000). Set 0 to disable. */
  pollInterval?: number
  /** Only poll when the component is visible (default: true) */
  useVisibilityObserver?: boolean
  /** Enable polling only (default: true) */
  enabled?: boolean
}

interface UseOrderPollingReturn {
  /** The latest order data */
  order: Order | null
  /** Whether data is currently being fetched */
  isLoading: boolean
  /** Last fetch error, if any */
  error: string | null
  /** Manually trigger a refresh */
  refresh: () => Promise<void>
  /** Timestamp of the last status change detected, if any */
  lastStatusChangeAt: Date | null
  /** Previous status (before the change) */
  previousStatus: string | null
  /** Timestamp of last successful fetch */
  lastUpdated: Date | null
}

export function useOrderPolling(
  orderId: string | null,
  options: UseOrderPollingOptions = {}
): UseOrderPollingReturn {
  const {
    pollInterval = 30000,
    useVisibilityObserver = true,
    enabled = true,
  } = options

  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastStatusChangeAt, setLastStatusChangeAt] = useState<Date | null>(null)
  const [previousStatus, setPreviousStatus] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const isVisibleRef = useRef(true)
  const mountedRef = useRef(true)
  const previousStatusRef = useRef<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!orderId || !enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) throw new Error('Failed to fetch order')

      const data = await res.json()

      if (!mountedRef.current) return

      // Detect status change
      if (previousStatusRef.current && previousStatusRef.current !== data.status) {
        setLastStatusChangeAt(new Date())
        setPreviousStatus(previousStatusRef.current)
      }
      previousStatusRef.current = data.status

      setOrder(data)
      setLastUpdated(new Date())
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to refresh order')
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [orderId, enabled])

  // Initial fetch
  useEffect(() => {
    if (orderId && enabled) {
      fetchOrder()
    }
  }, [orderId, enabled, fetchOrder])

  // Auto-refresh polling
  useEffect(() => {
    if (pollInterval <= 0 || !orderId || !enabled) return

    const interval = setInterval(() => {
      if (isVisibleRef.current && mountedRef.current) {
        fetchOrder()
      }
    }, pollInterval)

    return () => clearInterval(interval)
  }, [pollInterval, orderId, enabled, fetchOrder])

  // Visibility observer - document visibility
  useEffect(() => {
    if (!useVisibilityObserver || !enabled) return

    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden
      // When tab becomes visible again, immediately refresh
      if (!document.hidden) {
        fetchOrder()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [useVisibilityObserver, enabled, fetchOrder])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    order,
    isLoading,
    error,
    refresh: fetchOrder,
    lastStatusChangeAt,
    previousStatus,
    lastUpdated,
  }
}
