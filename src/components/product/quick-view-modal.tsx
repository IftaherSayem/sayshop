'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, ShoppingCart, Minus, Plus, Maximize } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { formatPrice, getDiscountPercentage, parseImages } from '@/lib/types';
import type { Product } from '@/lib/types';
import { toast } from 'sonner';
import { ImageLightbox } from './image-lightbox';

interface QuickViewModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, open, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const setView = useUIStore((s) => s.setView);

  // Reset quantity and image when product changes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setQuantity(1);
      setSelectedImageIndex(0);
    }
  };

  if (!product) return null;

  const images = parseImages(product.images);
  const discount = product.comparePrice
    ? getDiscountPercentage(product.price, product.comparePrice)
    : 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      quantity,
      image: images[selectedImageIndex]?.url || '/images/products/headphones.png',
      stock: product.stock,
    });
    toast.success(`${product.name} added to cart`);
    onClose();
    setQuantity(1);
  };

  const handleViewFull = () => {
    onClose();
    setQuantity(1);
    setSelectedImageIndex(0);
    setView({ type: 'product-detail', productId: product.id });
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.min(Math.max(prev + delta, 1), product.stock));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-xl shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {/* Left: Product Image */}
            <div className="relative aspect-square bg-muted">
              <Image
                src={images[selectedImageIndex]?.url || '/images/products/headphones.png'}
                alt={images[selectedImageIndex]?.alt || product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              {discount > 0 && (
                <Badge className="absolute top-3 left-3 bg-red-500 text-white hover:bg-red-600 text-sm">
                  -{discount}%
                </Badge>
              )}
              {product.stock <= 5 && product.stock > 0 && (
                <Badge className="absolute top-3 right-3 bg-amber-500 text-white hover:bg-amber-600 text-xs">
                  Only {product.stock} left
                </Badge>
              )}
              {/* Click to expand hint on image */}
              <button
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors duration-200"
                onClick={() => setLightboxOpen(true)}
                aria-label="View image in lightbox"
              >
                <div className="flex items-center gap-2 text-white opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black/50 rounded-lg px-3 py-2 backdrop-blur-sm pointer-events-none">
                  <Maximize className="h-4 w-4" />
                  <span className="text-sm font-medium">Expand</span>
                </div>
              </button>
              {/* Image dots for multiple images */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/30 rounded-full px-2 py-1 backdrop-blur-sm">
                  {images.map((_, index) => (
                    <button
                      key={`qv-thumb-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(index);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === selectedImageIndex
                          ? 'bg-orange-400 w-4'
                          : 'bg-white/60 hover:bg-white/90'
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="flex flex-col p-5 sm:p-6 gap-3.5 overflow-y-auto max-h-[80vh]">
              <DialogHeader className="space-y-0 p-0 text-left">
                {product.brand && (
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {product.brand}
                  </p>
                )}
                <DialogTitle className="text-xl font-bold leading-tight pr-6">
                  {product.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Quick view of {product.name}
                </DialogDescription>
              </DialogHeader>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(product.rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-muted text-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''})
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
                {product.comparePrice && (
                  <>
                    <span className="text-base text-muted-foreground line-through">
                      {formatPrice(product.comparePrice)}
                    </span>
                    <Badge variant="secondary" className="text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
                      Save {discount}%
                    </Badge>
                  </>
                )}
              </div>

              {/* Short Description */}
              {product.shortDesc && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {product.shortDesc}
                </p>
              )}

              <Separator />

              {/* Stock */}
              {product.stock === 0 ? (
                <p className="text-sm font-medium text-red-500">Out of Stock</p>
              ) : product.stock <= 5 ? (
                <p className="text-sm font-medium text-amber-500">
                  Only {product.stock} left in stock — order soon!
                </p>
              ) : (
                <p className="text-sm font-medium text-green-600">In Stock</p>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Qty:</span>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-r-none"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="flex h-9 w-10 items-center justify-center border-x text-sm font-medium">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-l-none"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-auto pt-2">
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-semibold border-orange-500 text-orange-500 hover:bg-orange-50"
                  onClick={handleViewFull}
                >
                  View Full Details
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox for quick view images */}
      <ImageLightbox
        key={selectedImageIndex}
        images={images.map((img) => ({ url: img.url, alt: img.alt }))}
        initialIndex={selectedImageIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
}
