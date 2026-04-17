'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

function getInitialProgress(): number {
  if (typeof window === 'undefined') return 0;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (docHeight <= 0) return 0;
  return Math.min((window.scrollY / docHeight) * 100, 100);
}

export function ScrollProgress() {
  const [progress, setProgress] = useState(getInitialProgress);
  const rafRef = useRef<number | null>(null);

  const updateProgress = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (docHeight > 0) {
      const scrollPercent = Math.min((scrollTop / docHeight) * 100, 100);
      setProgress(scrollPercent);
    } else {
      setProgress(0);
    }

    rafRef.current = null;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(updateProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateProgress]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-1">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600"
        initial={{ width: 0 }}
        animate={{
          width: `${progress}%`,
          opacity: progress > 0 ? 1 : 0,
        }}
        transition={{
          width: { type: 'spring', stiffness: 120, damping: 30, mass: 0.8 },
          opacity: { duration: 0.3 },
        }}
      />
    </div>
  );
}
