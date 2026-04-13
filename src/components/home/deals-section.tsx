'use client';

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Star, ArrowRight } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { formatPrice, getDiscountPercentage, parseImages } from "@/lib/types";
import type { Product } from "@/lib/types";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeRefetch } from "@/hooks/use-supabase-realtime";

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 11,
    minutes: 59,
    seconds: 59,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 11;
          minutes = 59;
          seconds = 59;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="flex items-center gap-0.5 sm:gap-1">
        <span className="bg-foreground text-background px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm font-bold">
          {pad(timeLeft.hours)}
        </span>
        <span className="text-foreground font-bold text-xs">:</span>
        <span className="bg-foreground text-background px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm font-bold">
          {pad(timeLeft.minutes)}
        </span>
        <span className="text-foreground font-bold text-xs">:</span>
        <span className="bg-foreground text-background px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm font-bold">
          {pad(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
}

interface DealProductCardProps {
  product: Product;
}

function DealProductCard({ product }: DealProductCardProps) {
  const images = parseImages(product.images);
  const discount = product.comparePrice
    ? getDiscountPercentage(product.price, product.comparePrice)
    : 0;
  const addItem = useCartStore((s) => s.addItem);
  const setView = useUIStore((s) => s.setView);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      quantity: 1,
      image: images[0]?.url || "/images/products/headphones.png",
      stock: product.stock,
    });
  };

  return (
    <Card
      className="group cursor-pointer overflow-hidden border border-border/50 py-0 gap-0 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full"
      onClick={() => setView({ type: "product-detail", productId: product.id })}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={images[0]?.url || "/images/products/headphones.png"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600 text-xs">
            -{discount}%
          </Badge>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity translate-y-0 sm:translate-y-2 sm:group-hover:translate-y-0">
          <Button
            size="sm"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add to Cart
          </Button>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-2">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium">{product.rating}</span>
          <span className="text-xs text-muted-foreground">
            ({product.reviewCount})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-orange-600">
            {formatPrice(product.price)}
          </span>
          {product.comparePrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function DealsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeTick, setRealtimeTick] = useState(0);
  const setView = useUIStore((s) => s.setView);

  // Realtime refetch for deals (products with discounts)
  useRealtimeRefetch({
    table: 'products',
    enabled: true,
    refetch: useCallback(() => setRealtimeTick((t) => t + 1), []),
  });

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products?sort=popular&limit=8");
        if (res.ok) {
          const data = await res.json();
          // Filter only products with comparePrice (discounted)
          const discounted = data.products.filter(
            (p: Product) => p.comparePrice && p.comparePrice > p.price
          );
          setProducts(discounted);
        }
      } catch (error) {
        console.error("Failed to fetch deals:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [realtimeTick]);

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-orange-50/50 to-transparent dark:from-orange-950/20 dark:to-transparent">
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
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="h-0.5 max-w-24 mx-auto sm:mx-0 mb-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-600" />
            <h2 className="text-2xl md:text-3xl font-bold">Today&apos;s Deals</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Hurry up! These deals won&apos;t last
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Ends in</span>
            <CountdownTimer />
          </div>
        </motion.div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`deals-sk-${i}`}>
                <Skeleton className="aspect-square rounded-xl mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No deals available right now.</p>
            <p className="text-sm mt-1">Check back soon for new promotions!</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {products.map((product) => (
              <motion.div key={product.id} variants={itemVariants} className="h-full">
                <DealProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* View All Button */}
        {products.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-center mt-8"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-300"
              onClick={() => setView({ type: "products", sort: "popular" })}
            >
              View All Deals
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        )}
      </div>
      </motion.div>
    </section>
  );
}
