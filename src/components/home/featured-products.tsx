'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/types";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeRefetch } from "@/hooks/use-supabase-realtime";

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeTick, setRealtimeTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const setView = useUIStore((s) => s.setView);

  // Realtime refetch for featured products
  useRealtimeRefetch({
    table: 'products',
    filter: 'is_featured=eq.true',
    enabled: true,
    refetch: useCallback(() => setRealtimeTick((t) => t + 1), []),
  });

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products?featured=true&limit=10");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
        }
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [realtimeTick]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <div className="h-0.5 max-w-24 mb-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-600" />
            <h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
          </div>
          <button
            onClick={() => setView({ type: "products" })}
            className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {/* Scroll Controls + Cards */}
        <div className="relative group">
          {/* Left Arrow */}
          {products.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 hidden md:flex"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Scrollable Row */}
          {loading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`feat-sk-${i}`} className="min-w-[200px] sm:min-w-[220px] md:min-w-[240px]">
                  <Skeleton className="aspect-square rounded-xl mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory items-stretch"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className="min-w-[calc(50%-0.5rem)] sm:min-w-[calc(33.333%-0.667rem)] md:min-w-[calc(20%-0.8rem)] snap-start flex-shrink-0"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          {/* Right Arrow */}
          {products.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 hidden md:flex"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
