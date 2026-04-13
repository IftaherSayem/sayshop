'use client';

import { useCallback } from 'react';

export interface RecentlyViewedItem {
  productId: string;
  name: string;
  price: number;
  comparePrice: number | null;
  image: string;
  viewedAt: string;
}

export function useRecentlyViewed() {
  const addToRecentlyViewed = useCallback((productId: string) => {
    fetch('/api/recently-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    }).catch(() => {
      // Silent fail — don't block the UI
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    fetch('/api/recently-viewed', {
      method: 'DELETE',
    }).catch(() => {
      // Silent fail
    });
  }, []);

  return {
    addToRecentlyViewed,
    clearRecentlyViewed,
  };
}
