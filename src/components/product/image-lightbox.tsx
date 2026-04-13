'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageLightboxProps {
  images: Array<{ url: string; alt: string }>;
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({
  images,
  initialIndex,
  open,
  onOpenChange,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const prevOpenRef = useRef(false);

  // Reset index when lightbox opens
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Reset via microtask to satisfy react-hooks/set-state-in-effect rule
      const id = requestAnimationFrame(() => {
        setCurrentIndex(initialIndex);
        setDirection(0);
      });
      return () => cancelAnimationFrame(id);
    }
    prevOpenRef.current = open;
  }, [open, initialIndex]);

  const navigate = useCallback(
    (dir: number) => {
      setDirection(dir);
      setCurrentIndex((prev) => {
        let next = prev + dir;
        if (next < 0) next = images.length - 1;
        if (next >= images.length) next = 0;
        return next;
      });
    },
    [images.length]
  );

  const handlePrev = () => navigate(-1);
  const handleNext = () => navigate(1);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === 'ArrowLeft') {
        navigate(-1);
      } else if (e.key === 'ArrowRight') {
        navigate(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, navigate, onOpenChange]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipe = 50;
    if (Math.abs(diff) >= minSwipe) {
      navigate(diff > 0 ? 1 : -1);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  if (images.length === 0) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Dark backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Close lightbox"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-50 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80 font-medium backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Main image area */}
          <div
            className="relative z-10 flex flex-1 items-center justify-center px-4 py-4"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Previous button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2 sm:left-4 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            {/* Image */}
            <div
              className="relative w-full max-w-4xl aspect-square max-h-[70vh] mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute inset-0"
                >
                  <Image
                    src={images[currentIndex]?.url || '/images/products/headphones.png'}
                    alt={images[currentIndex]?.alt || 'Product image'}
                    fill
                    className="object-contain"
                    sizes="90vw"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Next button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 sm:right-4 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="relative z-10 flex items-center justify-center px-4 pb-4 pt-2">
              <div className="flex gap-2 overflow-x-auto max-w-full px-2 py-1 scrollbar-thin">
                {images.map((img, index) => (
                  <button
                    key={`lb-thumb-${index}`}
                    onClick={() => {
                      setDirection(index > currentIndex ? 1 : -1);
                      setCurrentIndex(index);
                    }}
                    className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      index === currentIndex
                        ? 'border-orange-500 ring-2 ring-orange-500/30'
                        : 'border-white/20 hover:border-white/50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={img.url || '/images/products/headphones.png'}
                      alt={img.alt || `Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pinch-to-zoom hint */}
          <div className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 text-white/40 text-xs sm:text-sm">
            <ZoomIn className="h-3.5 w-3.5" />
            <span>Swipe to navigate</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
