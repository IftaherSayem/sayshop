'use client';

import { useState, useEffect } from 'react';

const messages = [
  '🔥 Flash Sale: 20% off all headphones',
  '✨ New arrivals every week',
  '🚚 Free shipping over $50',
  '⭐ Rated 4.8/5 by 10K+ customers',
  '💳 Secure checkout with multiple payment options',
  '🎁 Gift cards available — perfect for any occasion',
  '🔄 30-day hassle-free returns',
  '📦 Fast & reliable delivery worldwide',
];

export function PromoTicker() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay mount to ensure smooth animation start
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Triple the messages for seamless infinite scroll (unique keys)
  const tripled = [...messages, ...messages, ...messages];

  return (
    <div className="w-full overflow-hidden bg-orange-50 dark:bg-orange-950/50 border-y border-orange-200/50 dark:border-orange-800/50">
      <div
        className="promo-ticker-track flex whitespace-nowrap py-3 will-change-transform"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.3s ease' }}
      >
        {tripled.map((msg, i) => (
          <span
            key={`promo-${i}`}
            className="inline-flex items-center mx-8 text-sm font-medium text-orange-700 dark:text-orange-300 select-none"
          >
            {msg}
            <span className="ml-8 text-orange-400 dark:text-orange-600">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
