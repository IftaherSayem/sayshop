'use client';
import { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star, ShoppingCart, Eye, GitCompareArrows, Truck, Coins, Bell, CheckCircle } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useCompareStore } from "@/stores/compare-store";
import { useStockAlertStore } from "@/stores/stock-alert-store";
import { useUIStore } from "@/stores/ui-store";
import { formatPrice, getDiscountPercentage, parseImages } from "@/lib/types";
import type { Product } from "@/lib/types";
import { toast } from "sonner";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

import { memo } from "react";

function isNewProduct(createdAt: string): boolean {
  try {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  } catch {
    return false;
  }
}

export const ProductCard = memo(function ProductCard({ product, onQuickView }: ProductCardProps) {
  const images = parseImages(product.images);
  const discount = product.comparePrice ? getDiscountPercentage(product.price, product.comparePrice) : 0;
  const addItem = useCartStore((s) => s.addItem);
  const setView = useUIStore((s) => s.setView);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInCompare = useCompareStore((s) => s.isInCompare);
  const toggleCompare = useCompareStore((s) => s.toggleItem);
  const addStockAlert = useStockAlertStore((s) => s.addAlert);
  const isAlerted = useStockAlertStore((s) => s.isAlerted);

  const wishlisted = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);
  const isNew = isNewProduct(product.createdAt);
  const hasFreeShipping = product.price >= 50;
  const outOfStock = product.stock === 0;
  const notified = isAlerted(product.id);

  // 3D tilt effect
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const [shineStyle, setShineStyle] = useState<React.CSSProperties>({});
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        window.matchMedia('(hover: none)').matches ||
        'ontouchstart' in window
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || !cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transformStyle: 'preserve-3d',
      transition: 'transform 0.1s ease-out',
    });

    setShineStyle({
      background: `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.06) 0%, transparent 60%)`,
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
      transformStyle: 'preserve-3d',
      transition: 'transform 0.5s ease-out',
    });
    setShineStyle({});
  };

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
    toast.success(`${product.name} added to cart`);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      image: images[0]?.url || "/images/products/headphones.png",
      addedAt: Date.now(),
    });
    toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompare({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      image: images[0]?.url || "/images/products/headphones.png",
      rating: product.rating,
      reviewCount: product.reviewCount,
      brand: product.brand,
      stock: product.stock,
      category: product.category?.name || '',
      description: product.shortDesc || product.description,
    });
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setView({ type: "product-detail", productId: product.id, productSlug: product.slug, categorySlug: product.category?.slug });
  };

  const handleNotifyMe = (e: React.MouseEvent) => {
    e.stopPropagation();
    addStockAlert({
      productId: product.id,
      productName: product.name,
      productImage: images[0]?.url || "/images/products/headphones.png",
    });
    toast.success("We'll notify you when this product is back in stock!");
  };

  return (
    <Card
      ref={cardRef}
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 relative flex flex-col h-full"
      style={tiltStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setView({ type: "product-detail", productId: product.id, productSlug: product.slug, categorySlug: product.category?.slug })}
    >
      {/* Shine overlay for 3D tilt effect (desktop only) */}
      {!isTouchDevice && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none z-20"
          style={shineStyle}
        />
      )}
      {/* Shimmer border effect on hover (desktop only) */}
      {!isTouchDevice && (
        <div className="absolute inset-0 rounded-lg pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 rounded-lg p-[2px] overflow-hidden">
            <div className="absolute inset-[-50%] bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={images[0]?.url || "/images/products/headphones.png"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {/* Discount badge - top left */}
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600 -rotate-1 z-[5]">
            -{discount}%
          </Badge>
        )}
        {/* NEW badge - top left, below discount badge or at top if no discount */}
        {isNew && (
          <Badge
            className={`absolute top-2 bg-emerald-500 text-white hover:bg-emerald-600 z-[5] ${
              discount > 0 ? 'left-2 top-[calc(1.125rem+1.5rem)]' : 'left-2'
            }`}
          >
            NEW
          </Badge>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <Badge className="absolute top-2 right-2 bg-amber-500 text-white hover:bg-amber-600 z-[5]">
            Only {product.stock} left
          </Badge>
        )}

        {/* Action buttons - bottom right of image, always visible on mobile, hover on desktop */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 translate-y-0 sm:translate-y-2 sm:group-hover:translate-y-0 z-[5]">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/90 hover:bg-white dark:bg-neutral-800/90 dark:hover:bg-neutral-800 shadow-sm"
            onClick={handleQuickView}
            aria-label="Quick view"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 bg-white/90 hover:bg-white dark:bg-neutral-800/90 dark:hover:bg-neutral-800 shadow-sm transition-colors duration-200 ${wishlisted ? 'text-red-500 hover:text-red-600' : ''}`}
            onClick={handleWishlistToggle}
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-3.5 w-3.5 transition-all duration-200 ${wishlisted ? 'fill-current scale-110' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 bg-white/90 hover:bg-white dark:bg-neutral-800/90 dark:hover:bg-neutral-800 shadow-sm transition-colors duration-200 ${inCompare ? 'text-blue-500 hover:text-blue-600' : ''}`}
            onClick={handleCompareToggle}
            aria-label="Toggle compare"
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Add to Cart overlay / Notify Me overlay - always visible on mobile, hover on desktop */}
        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 translate-y-0 sm:translate-y-4 sm:group-hover:translate-y-0 z-[5]">
          {outOfStock ? (
            notified ? (
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                disabled
              >
                <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                You'll be Notified ✓
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                onClick={handleNotifyMe}
              >
                <Bell className="h-4 w-4 mr-1" />
                Notify Me
              </Button>
            )
          ) : (
            <Button
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Add to Cart
            </Button>
          )}
        </div>
      </div>
      <CardContent className="p-3 pb-2.5 flex-1 flex flex-col min-h-[140px]">
        {/* Brand - always reserve space */}
        <p className="text-xs text-muted-foreground mb-1 min-h-[1rem]">
          {product.brand || '\u00A0'}
        </p>
        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-blue-700 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium">{product.rating}</span>
          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-lg">{formatPrice(product.price)}</span>
          {product.comparePrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>
        {/* Spacer to push bottom content down consistently */}
        <div className="flex-1" />
        {/* Bottom info row: always same height */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Coins className="h-3 w-3" />
            <span className="text-xs">{Math.floor(product.price)} pts</span>
          </div>
          {hasFreeShipping && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Truck className="h-3 w-3" />
              <span className="text-xs">Free Ship</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
