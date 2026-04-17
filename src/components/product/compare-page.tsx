'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompareStore, type CompareItem } from '@/stores/compare-store';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { formatPrice, getDiscountPercentage } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Scale,
  X,
  ShoppingCart,
  Star,
  Check,
  AlertCircle,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export function ComparePage() {
  const { items, removeItem, clearAll } = useCompareStore();
  const addItemToCart = useCartStore((s) => s.addItem);
  const setView = useUIStore((s) => s.setView);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Computed values for highlighting
  const lowestPrice = items.length > 0
    ? Math.min(...items.map((i) => i.price))
    : 0;
  const highestRating = items.length > 0
    ? Math.max(...items.map((i) => i.rating))
    : 0;

  const handleRemove = (productId: string) => {
    removeItem(productId);
    toast.success('Removed from comparison');
  };

  const handleClearAll = () => {
    clearAll();
    setShowClearConfirm(false);
    toast.success('Comparison list cleared');
  };

  const handleAddToCart = (item: CompareItem) => {
    if (item.stock === 0) {
      toast.error('This product is out of stock');
      return;
    }
    addItemToCart({
      productId: item.productId,
      name: item.name,
      price: item.price,
      comparePrice: item.comparePrice,
      quantity: 1,
      image: item.image,
      stock: item.stock,
    });
    toast.success(`${item.name} added to cart`);
  };

  // Comparison rows definition
  const comparisonRows = [
    {
      label: 'Price',
      render: (item: CompareItem) => (
        <div className="space-y-1">
          <span className={`text-lg font-bold ${item.price === lowestPrice && items.length > 1 ? 'text-blue-600' : ''}`}>
            {formatPrice(item.price)}
          </span>
          {item.comparePrice && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(item.comparePrice)}
              </span>
              <Badge className="bg-red-500 text-white hover:bg-red-600 text-[10px] px-1.5 py-0">
                -{getDiscountPercentage(item.price, item.comparePrice)}%
              </Badge>
            </div>
          )}
          {item.price === lowestPrice && items.length > 1 && (
            <Badge className="bg-blue-100 text-orange-700 dark:bg-orange-900/30 dark:text-blue-400 border-0 text-[10px]">
              Lowest Price
            </Badge>
          )}
        </div>
      ),
    },
    {
      label: 'Rating',
      render: (item: CompareItem) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Star className={`h-4 w-4 ${item.rating === highestRating && items.length > 1 ? 'fill-amber-400 text-amber-400' : 'fill-amber-400 text-amber-400'}`} />
            <span className={`text-sm font-medium ${item.rating === highestRating && items.length > 1 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {item.rating}
            </span>
            <span className="text-xs text-muted-foreground">
              ({item.reviewCount} reviews)
            </span>
          </div>
          {item.rating === highestRating && items.length > 1 && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px]">
              Top Rated
            </Badge>
          )}
        </div>
      ),
    },
    {
      label: 'Stock Status',
      render: (item: CompareItem) => (
        <div>
          {item.stock === 0 ? (
            <div className="flex items-center gap-1.5 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Out of Stock</span>
            </div>
          ) : item.stock <= 5 ? (
            <div className="flex items-center gap-1.5 text-amber-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Only {item.stock} left</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">In Stock</span>
            </div>
          )}
        </div>
      ),
    },
    {
      label: 'Brand',
      render: (item: CompareItem) => (
        <span className="text-sm text-muted-foreground">
          {item.brand || 'N/A'}
        </span>
      ),
    },
    {
      label: 'Category',
      render: (item: CompareItem) => (
        <Badge variant="secondary" className="text-xs">
          {item.category || 'N/A'}
        </Badge>
      ),
    },
    {
      label: 'Description',
      render: (item: CompareItem) => (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
          {item.description || 'No description available.'}
        </p>
      ),
    },
  ];

  // Empty state
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setView({ type: 'home' });
                }}
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Product Comparison</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6">
            <Scale className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No products to compare</h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Add products to your comparison list to see them side by side. You can compare up to 4 products at a time.
          </p>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setView({ type: 'products' })}
          >
            Browse Products
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Main comparison view
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setView({ type: 'home' });
              }}
            >
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Product Comparison</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Scale className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Product Comparison</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} product{items.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>

        {showClearConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-500 mr-1">Clear all?</span>
            <Button size="sm" variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleClearAll}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear All
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => setShowClearConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear All
          </Button>
        )}
      </div>

      {/* Product Cards Row */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin">
        <div className="flex gap-4 min-w-max">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.productId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-[220px] sm:w-[240px] flex-shrink-0"
              >
                <Card className="relative overflow-hidden border border-border/50">
                  <CardContent className="p-3">
                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 bg-white/90 dark:bg-neutral-800/90 hover:bg-white dark:hover:bg-neutral-800 shadow-sm z-10"
                      onClick={() => handleRemove(item.productId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>

                    {/* Image */}
                    <button
                      className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted mb-3 cursor-pointer"
                      onClick={() => setView({ type: 'product-detail', productId: item.productId })}
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="220px"
                      />
                    </button>

                    {/* Product name */}
                    <h3
                      className="font-medium text-sm line-clamp-2 mb-1 hover:text-blue-600 transition-colors cursor-pointer"
                      onClick={() => setView({ type: 'product-detail', productId: item.productId })}
                    >
                      {item.name}
                    </h3>

                    {/* Brand */}
                    {item.brand && (
                      <p className="text-xs text-muted-foreground mb-2">{item.brand}</p>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold">{formatPrice(item.price)}</span>
                      {item.comparePrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(item.comparePrice)}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium">{item.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({item.reviewCount})
                      </span>
                    </div>

                    {/* Stock */}
                    {item.stock === 0 ? (
                      <div className="flex items-center gap-1 text-red-500 text-xs mb-3">
                        <AlertCircle className="h-3 w-3" />
                        <span>Out of Stock</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-600 text-xs mb-3">
                        <Check className="h-3 w-3" />
                        <span>In Stock ({item.stock})</span>
                      </div>
                    )}

                    {/* Add to Cart */}
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      onClick={() => handleAddToCart(item)}
                      disabled={item.stock === 0}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add more slot if under 4 */}
          {items.length < 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-[220px] sm:w-[240px] flex-shrink-0"
            >
              <Card
                className="flex items-center justify-center border-2 border-dashed border-border/50 cursor-pointer hover:border-blue-300 transition-colors min-h-[380px]"
                onClick={() => setView({ type: 'products' })}
              >
                <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Add Product
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {4 - items.length} more allowed
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left text-sm font-medium text-muted-foreground p-4 w-[140px] sticky left-0 bg-muted/30 z-10">
                  Feature
                </th>
                {items.map((item) => (
                  <th key={item.productId} className="text-left p-4 min-w-[220px]">
                    <span className="text-sm font-medium line-clamp-1">
                      {item.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, index) => (
                <tr
                  key={row.label}
                  className={index < comparisonRows.length - 1 ? 'border-b' : ''}
                >
                  <td className="text-left text-sm font-medium text-muted-foreground p-4 bg-muted/10 sticky left-0 z-10">
                    {row.label}
                  </td>
                  {items.map((item) => (
                    <td key={item.productId} className="p-4 align-top">
                      {row.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
