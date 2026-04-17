'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

const ANNOUNCEMENTS = [
  {
    text: 'Flash Sale: Up to 50% off on Electronics!',
    cta: 'Shop Now',
    action: 'products',
  },
  {
    text: 'New User? Use code WELCOME10 for 10% off your first order!',
    cta: 'Get Code',
    action: 'products',
  },
  {
    text: 'Free Express Shipping on orders over $75 — Limited Time!',
    cta: 'Shop Now',
    action: 'products',
  },
];

const STORAGE_KEY = 'say-shop-banner-dismissed';
const VERSION_KEY = 'say-shop-banner-version';
const CURRENT_VERSION = '1';
const ROTATION_INTERVAL = 6000;

// useSyncExternalStore for dismissed state
let bannerDismissedCache: boolean | null = null;
const bannerSubscribers = new Set<() => void>();

function subscribeBanner(callback: () => void) {
  bannerSubscribers.add(callback);
  return () => {
    bannerSubscribers.delete(callback);
  };
}

function getBannerSnapshot(): boolean {
  if (bannerDismissedCache === null) {
    bannerDismissedCache = readBannerDismissed();
  }
  return bannerDismissedCache;
}

function getBannerServerSnapshot(): boolean {
  return false;
}

function readBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const wasDismissed = localStorage.getItem(STORAGE_KEY);
    if (storedVersion === CURRENT_VERSION && wasDismissed === 'true') {
      return true;
    }
    // Version changed, reset dismissal
    if (storedVersion !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
    return false;
  } catch {
    return false;
  }
}

function setBannerDismissed(value: boolean) {
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  bannerDismissedCache = value;
  bannerSubscribers.forEach((cb) => cb());
}

export function AnnouncementBanner() {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(100);

  const dismissed = useSyncExternalStore(
    subscribeBanner,
    getBannerSnapshot,
    getBannerServerSnapshot
  );

  const setView = useUIStore((s) => s.setView);

  // Set mounted state after hydration to enable animations
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Auto-rotate announcements
  useEffect(() => {
    if (!mounted || dismissed) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) return 100;
        return prev - (100 / (ROTATION_INTERVAL / 50));
      });
    }, 50);

    const rotationTimeout = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
      setProgress(100);
    }, ROTATION_INTERVAL);

    return () => {
      clearInterval(progressInterval);
      clearInterval(rotationTimeout);
    };
  }, [mounted, dismissed]);

  const handleDismiss = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  const handleCtaClick = useCallback(
    (action: string) => {
      setView({ type: action as 'products' });
    },
    [setView]
  );

  if (dismissed) return null;

  const announcement = ANNOUNCEMENTS[currentIndex];
  const showBanner = mounted && !dismissed;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative z-50 overflow-hidden"
        >
          <div className="relative bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white">
            {/* Content */}
            <div className="flex items-center justify-center px-4 h-11 sm:h-12 relative z-10">
              {/* Dot indicators - left side */}
              <div className="hidden sm:flex items-center gap-1.5 mr-4">
                {ANNOUNCEMENTS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentIndex(i);
                      setProgress(100);
                    }}
                    className={`rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                      i === currentIndex
                        ? 'w-5 h-1.5 bg-white'
                        : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/70'
                    }`}
                    aria-label={`Go to announcement ${i + 1}`}
                  />
                ))}
              </div>

              {/* Announcement text */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm font-medium text-center flex items-center gap-1 flex-wrap justify-center"
                >
                  {announcement.text}
                  <button
                    onClick={() => handleCtaClick(announcement.action)}
                    className="ml-1 inline-flex items-center font-bold underline underline-offset-2 hover:no-underline transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded whitespace-nowrap"
                  >
                    {announcement.cta} →
                  </button>
                </motion.p>
              </AnimatePresence>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Dismiss announcement"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-700/30">
              <motion.div
                className="h-full bg-white/60"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.05, ease: 'linear' }}
              />
            </div>

            {/* Mobile dot indicators - below text as overlay */}
            <div className="sm:hidden absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {ANNOUNCEMENTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentIndex(i);
                    setProgress(100);
                  }}
                  className={`rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                    i === currentIndex
                      ? 'w-4 h-1 bg-white/70'
                      : 'w-1 h-1 bg-white/30'
                  }`}
                  aria-label={`Go to announcement ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
