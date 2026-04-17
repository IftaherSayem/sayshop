'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCompareStore } from '@/stores/compare-store';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { GitCompareArrows, X } from 'lucide-react';
import { toast } from 'sonner';

export function CompareFloatingBar() {
  const { items, clearAll } = useCompareStore();
  const setView = useUIStore((s) => s.setView);
  const currentView = useUIStore((s) => s.currentView);

  // Don't show when on the compare page itself
  if (items.length === 0 || currentView.type === 'compare') return null;

  const handleCompareNow = () => {
    setView({ type: 'compare' });
  };

  const handleClear = () => {
    clearAll();
    toast.success('Comparison list cleared');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-lg"
      >
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <GitCompareArrows className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {items.length} product{items.length !== 1 ? 's' : ''} selected for comparison
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-white/80 hover:text-white hover:bg-white/10"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="h-8 bg-white text-blue-700 hover:bg-white/90 font-semibold"
              onClick={handleCompareNow}
            >
              Compare Now
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
