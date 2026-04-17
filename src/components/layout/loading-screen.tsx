'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

export function LoadingScreen() {
  const initialLoadDone = useUIStore((s) => s.initialLoadDone);
  const setInitialLoadDone = useUIStore((s) => s.setInitialLoadDone);
  const [visible, setVisible] = useState(!initialLoadDone);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 15 + 5;
        return next >= 90 ? 90 : next;
      });
    }, 200);

    // Complete progress and fade out
    const fadeTimer = setTimeout(() => {
      setProgress(100);
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        setInitialLoadDone(true);
      }, 400);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
    };
  }, [setInitialLoadDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          animate={{ opacity: fadeOut ? 0 : 1, scale: fadeOut ? 1.02 : 1 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5"
          >
            {/* Logo */}
            <motion.div
              className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 shadow-xl shadow-blue-600/30"
              animate={{ rotate: [0, 0, 0, -2, 2, 0] }}
              transition={{ duration: 2, delay: 0.3, ease: 'easeInOut' }}
            >
              <ShoppingBag className="h-10 w-10 text-white" />
            </motion.div>

            {/* Brand Name */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex items-center gap-1"
            >
              <span className="text-3xl font-bold text-blue-600">Say</span>
              <span className="text-3xl font-bold text-foreground">Shop</span>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 180 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-700"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs text-muted-foreground">Loading your experience...</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
