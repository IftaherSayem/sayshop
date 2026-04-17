'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, RefreshCw } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

// Seeded random number generator for consistent "daily picks"
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

function getDailySeed(): number {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rand = seededRandom(seed);
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRecommendations(products: Product[], seed: number): Product[] {
  if (products.length === 0) return [];

  // Score each product
  const scored = products.map((p) => {
    let score = 0;

    // Rating score (0-5 points for rating 0-5)
    score += p.rating * 1;

    // Discount score (0-10 points based on discount ratio)
    if (p.comparePrice && p.comparePrice > p.price) {
      const discountRatio = (p.comparePrice - p.price) / p.comparePrice;
      score += discountRatio * 20;
    }

    // Featured bonus (3 points)
    if (p.featured) {
      score += 3;
    }

    // Review count score (0-2 points for popularity)
    score += Math.min(p.reviewCount / 5, 2);

    return { product: p, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top 10 as pool
  const pool = scored.slice(0, Math.min(10, scored.length)).map((s) => s.product);

  // Shuffle with seed for daily picks
  const shuffled = shuffleWithSeed(pool, seed);

  // Return 6-8 products
  return shuffled.slice(0, Math.min(8, shuffled.length));
}

export function RecommendationsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seed, setSeed] = useState(getDailySeed());
  const scrollRef = useRef<HTMLDivElement>(null);
  const setView = useUIStore((s) => s.setView);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products?limit=12");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
          setRecommended(getRecommendations(data.products, seed));
        }
      } catch (error) {
        console.error("Failed to fetch products for recommendations:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [seed]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const newSeed = Date.now();
    setSeed(newSeed);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-blue-50/30 via-transparent to-transparent dark:from-orange-950/10 dark:via-transparent dark:to-transparent">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div>
            <div className="h-0.5 max-w-24 mb-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-700" />
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="text-2xl md:text-3xl font-bold">Recommended for You</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Handpicked products based on popularity and deals
            </p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={seed}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-orange-700"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Picks
              </Button>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Scroll Controls + Cards */}
        <div className="relative group">
          {/* Left Arrow (desktop only) */}
          {recommended.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 hidden lg:flex"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-2 md:hidden gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`rec-sk-${i}`}>
                  <Skeleton className="aspect-square rounded-xl mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No recommendations available yet</p>
            </div>
          ) : (
            <>
              {/* Mobile: 2-column grid */}
              <div className="grid grid-cols-2 gap-3 md:hidden">
                <AnimatePresence mode="popLayout">
                  {recommended.slice(0, 6).map((product, index) => (
                    <motion.div
                      key={`${product.id}-${seed}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Desktop: horizontal scroll */}
              <div
                ref={scrollRef}
                className="hidden md:flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory items-stretch"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <AnimatePresence mode="popLayout">
                  {recommended.map((product, index) => (
                    <motion.div
                      key={`${product.id}-${seed}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="min-w-[calc(25%-0.75rem)] lg:min-w-[calc(20%-0.8rem)] snap-start flex-shrink-0"
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* Right Arrow (desktop only) */}
          {recommended.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 hidden lg:flex"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      </motion.div>
    </section>
  );
}
