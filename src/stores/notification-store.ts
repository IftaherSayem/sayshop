import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  type: 'order_update' | 'new_order' | 'low_stock' | 'payment_status' | 'system'
  title: string
  message: string
  link?: string
  read: boolean
  created_at: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  initialized: boolean
  
  // Actions
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  addNotification: (notification: Notification) => void
  subscribeToRealtime: (userId: string) => any
}

export const useNotificationStore = create<NotificationState>()(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    initialized: false,

    fetchNotifications: async () => {
      set({ loading: true })
      try {
        const response = await fetch('/api/notifications')
        const data = await response.json()
        if (data.notifications) {
          const notifications = data.notifications
          const unreadCount = notifications.filter((n: Notification) => !n.read).length
          set({ notifications, unreadCount, initialized: true })
        }
      } catch (error) {
        console.error('[NOTIFICATIONS_STORE] Fetch error:', error)
      } finally {
        set({ loading: false })
      }
    },

    markAsRead: async (id: string) => {
      // Optimistic update
      const { notifications } = get()
      const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n)
      const unreadCount = updated.filter(n => !n.read).length
      set({ notifications: updated, unreadCount })

      try {
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      } catch (error) {
        console.error('[NOTIFICATIONS_STORE] Mark as read error:', error)
      }
    },

    markAllAsRead: async () => {
      const { notifications } = get()
      const updated = notifications.map(n => ({ ...n, read: true }))
      set({ notifications: updated, unreadCount: 0 })

      try {
        await fetch('/api/notifications/read-all', { method: 'PATCH' })
      } catch (error) {
        console.error('[NOTIFICATIONS_STORE] Mark all as read error:', error)
      }
    },

    addNotification: (notification: Notification) => {
      const { notifications } = get()
      // Check for duplicates
      if (notifications.some(n => n.id === notification.id)) return

      const updated = [notification, ...notifications].slice(0, 50)
      const unreadCount = updated.filter(n => !n.read).length
      set({ notifications: updated, unreadCount })
    },

    subscribeToRealtime: (userId: string) => {
      const supabase = createSupabaseBrowserClient()
      
      // Use a slightly more unique channel name to avoid conflicts during rapid re-renders
      const channelId = `notify-${userId}-${Math.random().toString(36).slice(2, 7)}`
      const channel = supabase.channel(channelId)
      
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            get().addNotification(payload.new as Notification)
          }
        )
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            // Log issues but don't crash
            console.warn(`[REALTIME] Subscription status for ${userId}:`, status)
          }
        })

      return () => {
        // Essential: Unsubscribe and remove the channel instance
        supabase.removeChannel(channel)
      }
    }
  })
)
