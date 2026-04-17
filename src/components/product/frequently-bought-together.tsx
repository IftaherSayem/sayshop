'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { formatPrice, getDiscountPercentage, parseImages } from '@/lib/types';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { motion } from 'framer-motion';

interface FrequentlyBoughtTogetherProps {
  categoryId: string;
  productId: string;
}

export function FrequentlyBoughtTogether({ categoryId, productId }: FrequentlyBoughtTogetherProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const addItem = useCartStore((s) => s.addItem);
  const setView = useUIStore((s) => s.setView);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    async function fetchProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          categoryId,
          limit: '4',
        });
        const res = await fetch(`/api/products?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          const filtered = (data.products || [])
            .filter((p: Product) => p.id !== productId)
            .slice(0, 4);
          setProducts(filtered);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProducts();
    return () => { cancelled = true; };
  }, [categoryId, productId]);

  const handleAddToCart = (p: Product) => {
    const img = parseImages(p.images);
    addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      comparePrice: p.comparePrice,
      quantity: 1,
      image: img[0]?.url || '/images/products/headphones.png',
      stock: p.stock,
    });
    sonnerToast.success(`Added ${p.name} to cart`);
  };

  const handleCardClick = (p: Product) => {
    setView({ type: 'product-detail', productId: p.id });
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Frequently Bought Together</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <Card key={`fbt-sk-${i}`} className="flex-shrink-0 w-[200px] sm:w-[220px]">
              <CardContent className="p-0">
                <Skeleton className="aspect-square w-full rounded-t-lg" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <h2 className="text-2xl font-bold">Frequently Bought Together</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
        {products.map((p, index) => {
          const img = parseImages(p.images);
          const disc = p.comparePrice ? getDiscountPercentage(p.price, p.comparePrice) : 0;
          return (
            <motion.div
              key={p.id}
              className="flex-shrink-0 w-[200px] sm:w-[220px] snap-start"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
            >
              <Card className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                <CardContent className="p-0 flex flex-col flex-1">
                  <div
                    className="relative aspect-square overflow-hidden"
                    onClick={() => handleCardClick(p)}
                  >
                    <Image
                      src={img[0]?.url || '/images/products/headphones.png'}
                      alt={p.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="220px"
                    />
                    {disc > 0 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded">
                        -{disc}%
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1 gap-2">
                    <h3
                      className="text-sm font-medium line-clamp-2 hover:text-blue-600 transition-colors"
                      onClick={() => handleCardClick(p)}
                    >
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-auto">
                      <span className="text-base font-bold">{formatPrice(p.price)}</span>
                      {p.comparePrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(p.comparePrice)}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(p);
                      }}
                      disabled={p.stock === 0}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                      {p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
