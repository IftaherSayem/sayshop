'use client';

import { useState, useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { Package, Tag, Heart, Coins } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'order' | 'promo' | 'wishlist' | 'reward';
}

const initialNotifications: Notification[] = [];

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'order':
      return <Package className="h-4 w-4 text-blue-500" />;
    case 'promo':
      return <Tag className="h-4 w-4 text-orange-500" />;
    case 'wishlist':
      return <Heart className="h-4 w-4 text-red-500" />;
    case 'reward':
      return <Coins className="h-4 w-4 text-amber-500" />;
  }
}

function getNotificationBg(type: Notification['type']) {
  switch (type) {
    case 'order':
      return 'bg-blue-100 dark:bg-blue-900/40';
    case 'promo':
      return 'bg-orange-100 dark:bg-orange-900/40';
    case 'wishlist':
      return 'bg-red-100 dark:bg-red-900/40';
    case 'reward':
      return 'bg-amber-100 dark:bg-amber-900/40';
  }
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleViewAll = useCallback(() => {
    toast.info('All notifications page coming soon!');
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
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
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 border-b border-border/50 last:border-b-0 ${
                    !notification.read ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!notification.read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                  )}

                  {/* Type icon */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getNotificationBg(notification.type)}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-tight ${
                        !notification.read ? 'font-semibold' : 'font-medium'
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {notification.time}
                    </p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="border-t">
          <button
            onClick={handleViewAll}
            className="flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-b-lg"
          >
            View All Notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
