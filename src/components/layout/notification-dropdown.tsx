'use client';

import { useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Package, Tag, Heart, Coins, AlertTriangle, CreditCard, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotificationStore, type Notification } from '@/stores/notification-store';
import { useAuthStore } from '@/stores/auth-store';

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'order_update':
      return <Package className="h-4 w-4 text-blue-500" />;
    case 'new_order':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case 'low_stock':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'payment_status':
      return <CreditCard className="h-4 w-4 text-purple-500" />;
    case 'system':
      return <Bell className="h-4 w-4 text-zinc-500" />;
    default:
      return <Bell className="h-4 w-4 text-blue-500" />;
  }
}

function getNotificationBg(type: Notification['type']) {
  switch (type) {
    case 'order_update':
      return 'bg-blue-100 dark:bg-blue-900/40';
    case 'new_order':
      return 'bg-emerald-100 dark:bg-emerald-900/40';
    case 'low_stock':
      return 'bg-amber-100 dark:bg-amber-900/40';
    case 'payment_status':
      return 'bg-purple-100 dark:bg-purple-900/40';
    case 'system':
      return 'bg-zinc-100 dark:bg-zinc-800';
    default:
      return 'bg-blue-100 dark:bg-blue-900/40';
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function NotificationDropdown() {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    initialized,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    subscribeToRealtime,
  } = useNotificationStore();

  // Fetch notifications on mount & subscribe to realtime
  useEffect(() => {
    if (!user) return;

    if (!initialized) {
      fetchNotifications();
    }

    const unsubscribe = subscribeToRealtime(user.id);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user, initialized, fetchNotifications, subscribeToRealtime]);

  // Poll every 30s as a fallback for realtime
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-red-500/30"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 shadow-2xl border-zinc-200 dark:border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-zinc-50/50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[420px] overflow-y-auto">
          {loading && !initialized ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded" />
                    <div className="h-2 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-14 w-14 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                <Bell className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-500">All caught up!</p>
              <p className="text-xs text-zinc-400 mt-1">No new notifications</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notification) => (
                <motion.button
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => markAsRead(notification.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 ${
                    !notification.read
                      ? 'bg-blue-50/40 dark:bg-blue-950/10'
                      : ''
                  }`}
                >
                  {/* Unread indicator dot */}
                  <div className="flex items-start gap-2 w-full">
                    {!notification.read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600 animate-pulse" />
                    )}

                    {/* Type icon */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${getNotificationBg(notification.type)}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-tight ${
                          !notification.read ? 'font-bold' : 'font-medium'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-semibold uppercase tracking-wider">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={fetchNotifications}
              className="flex w-full items-center justify-center px-4 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20 transition-colors focus-visible:outline-none rounded-b-lg uppercase tracking-wider"
            >
              Refresh Notifications
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
