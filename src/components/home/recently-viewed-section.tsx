'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUIStore } from '@/stores/ui-store';
import { formatPrice } from '@/lib/types';
import type { RecentlyViewedItem } from '@/hooks/use-recently-viewed';

export function RecentlyViewedSection() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const setView = useUIStore((s) => s.setView);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/recently-viewed');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      } else if (res.status === 401) {
        // Not authenticated — don't show the section
        setItems([]);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleClearHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/recently-viewed', { method: 'DELETE' });
      if (res.ok) {
        setItems([]);
        toast.success('Recently viewed history cleared');
      }
    } catch {
      // Silent fail
    }
  }, []);

  const handleNavigate = useCallback(
    (productId: string) => {
      setView({ type: 'product-detail', productId });
    },
    [setView]
  );

  // Loading skeleton
  if (loading) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-orange-950/30">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`rv-skeleton-${i}`}
                className="flex-shrink-0 flex items-center gap-3 p-2.5 rounded-xl border border-border/50 bg-card w-[220px] sm:w-[240px]"
              >
                <Skeleton className="h-[72px] w-[72px] rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Don't render if no items
  if (items.length === 0) return null;

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-orange-950/30">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Recently Viewed</h2>
              <span className="text-sm text-muted-foreground">
                ({items.length})
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={handleClearHistory}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear History
            </Button>
          </div>

          {/* Horizontal scrollable product row */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {items.map((item) => (
              <motion.button
                key={item.productId}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2 }}
                onClick={() => handleNavigate(item.productId)}
                className="flex-shrink-0 flex items-center gap-3 p-2.5 rounded-xl border border-border/50 hover:border-blue-200 hover:shadow-sm bg-card transition-all duration-200 group w-[220px] sm:w-[240px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {/* Product image */}
                <div className="relative h-[72px] w-[72px] flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    sizes="72px"
                  />
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium line-clamp-2 group-hover:text-blue-700 transition-colors">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold text-foreground">
                      {formatPrice(item.price)}
                    </span>
                    {item.comparePrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(item.comparePrice)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
