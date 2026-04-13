'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  table: string
  filter?: string // e.g., 'id=eq.123'
  schema?: string // default 'public'
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  enabled?: boolean
}

export function useSupabaseRealtime({
  table,
  filter,
  schema = 'public',
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createSupabaseBrowserClient()
    const channelName = `realtime-${table}-${filter || 'all'}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema,
          table,
          filter: filter || undefined,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && onInsert) onInsert(payload)
          else if (payload.eventType === 'UPDATE' && onUpdate) onUpdate(payload)
          else if (payload.eventType === 'DELETE' && onDelete) onDelete(payload)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, filter, schema, enabled, onInsert, onUpdate, onDelete])

  return channelRef
}

// Helper hook: refetch data when table changes with debounce
export function useRealtimeRefetch(options: {
  table: string
  filter?: string
  enabled?: boolean
  refetch: () => void
  debounceMs?: number
}) {
  const { table, filter, enabled = true, refetch, debounceMs = 1000 } = options
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedRefetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      refetch()
    }, debounceMs)
  }, [refetch, debounceMs])

  useSupabaseRealtime({
    table,
    filter,
    enabled,
    onInsert: debouncedRefetch,
    onUpdate: debouncedRefetch,
    onDelete: debouncedRefetch,
  })
}
