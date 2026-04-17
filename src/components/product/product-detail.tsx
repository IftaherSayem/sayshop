'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useCompareStore } from '@/stores/compare-store';
import { useStockAlertStore } from '@/stores/stock-alert-store';
import { useUIStore } from '@/stores/ui-store';
import { ProductCard } from './product-card';
import { QuickViewModal } from './quick-view-modal';
import { ImageLightbox } from './image-lightbox';
import { FrequentlyBoughtTogether } from './frequently-bought-together';
import { ProductQA } from './product-qa';
import { ProductVideoSection } from './product-video-section';
import { SizeGuideModal } from './size-guide-modal';
import { formatPrice, getDiscountPercentage, parseImages, parseItems } from '@/lib/types';
import type { Product, Review } from '@/lib/types';
// Toast standardized on sonner (see line 69)
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useStockRefresh } from '@/hooks/use-stock-refresh';
import { useRealtimeRefetch } from '@/hooks/use-supabase-realtime';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import {
  Star,
  Heart,
  ShoppingCart,
  Truck,
  RotateCcw,
  Minus,
  Plus,
  ChevronRight,
  Check,
  AlertCircle,

  Share2,
  Copy,
  GitCompareArrows,
  Tag,
  PackageCheck,
  User,
  Maximize,
  Ruler,
  MessageCircleQuestion,
  Bell,
  CheckCircle,
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

interface ProductDetailProps {
  productId: string;
  productSlug?: string;
}

// --- Color/Size variant constants ---
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

const COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a',
  white: '#f5f5f5',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  pink: '#ec4899',
  purple: '#8b5cf6',
  orange: '#f97316',
  gray: '#6b7280',
  brown: '#92400e',
  yellow: '#eab308',
  navy: '#1e3a5f',
  silver: '#c0c0c0',
  gold: '#d4a843',
  beige: '#d4c5a9',
};

const DEFAULT_COLORS_BY_CATEGORY: Record<string, string[]> = {
  electronics: ['black', 'white', 'silver', 'navy'],
  clothing: ['black', 'white', 'blue', 'gray'],
};

const DEFAULT_COLORS = ['black', 'white', 'red', 'blue'];

function parseProductTags(tagsStr: string | null): string[] {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    if (Array.isArray(parsed)) return parsed.map((t: string) => t.toLowerCase());
  } catch {
    // fall back to comma-separated
  }
  return tagsStr.split(',').map((t) => t.trim().toLowerCase());
}

function getAvailableColors(tagsStr: string | null, categoryName?: string) {
  const tagList = parseProductTags(tagsStr);
  const matchedColors = tagList
    .map((tag) => COLOR_MAP[tag])
    .filter(Boolean);
  if (matchedColors.length > 0) {
    const names = tagList.filter((t) => COLOR_MAP[t]);
    return names.map((name) => ({ name, hex: COLOR_MAP[name] }));
  }
  // Use defaults based on category
  const catLower = (categoryName || '').toLowerCase();
  let defaults = DEFAULT_COLORS;
  for (const [key, colors] of Object.entries(DEFAULT_COLORS_BY_CATEGORY)) {
    if (catLower.includes(key)) {
      defaults = colors;
      break;
    }
  }
  return defaults.map((name) => ({ name, hex: COLOR_MAP[name] }));
}

export function ProductDetail({ productId, productSlug }: ProductDetailProps) {
  // --- State ---
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeTick, setRealtimeTick] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    userName: '',
    rating: 0,
    title: '',
    comment: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Quick view state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Image zoom state
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  // Social share state
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cart bounce state
  const [cartBouncing, setCartBouncing] = useState(false);

  // Stock verification state
  const [stockVerifying, setStockVerifying] = useState(false);
  const [verifiedStock, setVerifiedStock] = useState<number | null>(null);

  // Rating breakdown state
  const [ratingBreakdown, setRatingBreakdown] = useState<Record<string | number, number>>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [breakdownLoaded, setBreakdownLoaded] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Variant selector state
  const [selectedColor, setSelectedColor] = useState('black');
  const [selectedSize, setSelectedSize] = useState('M');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // Stores
  const addItem = useCartStore((s) => s.addItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const toggleWishlistItem = useWishlistStore((s) => s.toggleItem);
  const isInCompare = useCompareStore((s) => s.isInCompare);
  const toggleCompareItem = useCompareStore((s) => s.toggleItem);
  const addStockAlert = useStockAlertStore((s) => s.addAlert);
  const isAlerted = useStockAlertStore((s) => s.isAlerted);
  const setView = useUIStore((s) => s.setView);
  const goBack = useUIStore((s) => s.goBack);
  // sonnerToast imported above (line 69)

  // Recently viewed hook
  const { addToRecentlyViewed } = useRecentlyViewed();

  // Realtime refetch for product updates
  useRealtimeRefetch({
    table: 'products',
    filter: `id=eq.${productId}`,
    enabled: !!productId,
    refetch: useCallback(() => setRealtimeTick((t) => t + 1), []),
  });

  // Refs
  const reviewsTabRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const images = product ? parseImages(product.images) : [];
  const tags = product?.tags ? parseItems<string>(product.tags) : [];
  const wishlisted = product ? isInWishlist(product.id) : false;
  const inCompare = product ? isInCompare(product.id) : false;
  const notified = product ? isAlerted(product.id) : false;
  const discount =
    product && product.comparePrice
      ? getDiscountPercentage(product.price, product.comparePrice)
      : 0;

  // --- Variant helpers ---
  const availableColors = getAvailableColors(product?.tags ?? null, product?.category?.name);

  // Reset selected color when product changes
  useEffect(() => {
    if (availableColors.length > 0) {
      setSelectedColor(availableColors[0].name);
    }
    setSelectedSize('M');
  }, [product?.id]);

  // --- Fetch product ---
  useEffect(() => {
    let cancelled = false;
    async function fetchProduct() {
      setLoading(true);
      try {
        // Use slug lookup if no productId but slug is provided
        const apiUrl = productSlug && !productId
          ? `/api/products/slug/${encodeURIComponent(productSlug)}`
          : `/api/products/${productId}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        if (!cancelled) {
          setProduct(data);
          // Add to recently viewed via API (server-side tracking)
          addToRecentlyViewed(data.id || productId);
        }
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProduct();
    return () => { cancelled = true; };
  }, [productId, productSlug, realtimeTick]);

  // --- Fetch related products ---
  useEffect(() => {
    if (!product?.categoryId) return;
    let cancelled = false;
    async function fetchRelated() {
      try {
        const params = new URLSearchParams({
          categoryId: product?.categoryId || '',
          limit: '10',
        });
        const res = await fetch(`/api/products?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setRelatedProducts(
            (data.products || []).filter(
              (p: Product) => p.id !== product?.id
            )
          );
        }
      } catch {
        // silently ignore
      }
    }
    fetchRelated();
    return () => { cancelled = true; };
  }, [product?.categoryId, product?.id]);

  // --- Fetch reviews ---
  const fetchReviews = useCallback(async (page: number) => {
    setReviewsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '5',
      });
      if (!product) return;
      const res = await fetch(`/api/products/${product.id}/reviews?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setReviewTotalPages(data.totalPages || 1);
      setReviewTotal(data.total || 0);
      setReviewPage(page);
      if (data.ratingBreakdown) {
        setRatingBreakdown(data.ratingBreakdown);
        setBreakdownLoaded(true);
      }
    } catch {
      // silently ignore
    } finally {
      setReviewsLoading(false);
    }
  }, [product?.id]);

  // --- Initial Reviews Fetch ---
  useEffect(() => {
    if (product?.id) {
      fetchReviews(1);
    }
  }, [product?.id, fetchReviews]);

  // --- Scroll to reviews ---
  const scrollToReviews = () => {
    reviewsTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- Image zoom handlers ---
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainImageRef.current) return;
    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const handleImageMouseEnter = () => setIsZooming(true);
  const handleImageMouseLeave = () => setIsZooming(false);

  // --- Estimated delivery date ---
  const getEstimatedDelivery = () => {
    const today = new Date();
    let businessDays = 0;
    const endDate = new Date(today);
    while (businessDays < 5) {
      endDate.setDate(endDate.getDate() + 1);
      const dayOfWeek = endDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    // min date is 3 business days
    const minDate = new Date(today);
    let minDays = 0;
    while (minDays < 3) {
      minDate.setDate(minDate.getDate() + 1);
      const dayOfWeek = minDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        minDays++;
      }
    }
    const formatDate = (d: Date) => {
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    };
    return { min: formatDate(minDate), max: formatDate(endDate) };
  };

  // --- Copy link handler ---
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      sonnerToast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      sonnerToast.error('Failed to copy link');
    }
  };

  // --- Share handlers ---
  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out ${product?.name} on Say Shop!`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out ${product?.name} on Say Shop!`);
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank', 'noopener,noreferrer');
  };

  // --- Electronics category check ---
  const isElectronics = product?.category?.name?.toLowerCase().includes('electron')
    || product?.category?.name?.toLowerCase().includes('tech')
    || product?.category?.name?.toLowerCase().includes('gadget')
    || product?.category?.name?.toLowerCase().includes('computer')
    || product?.category?.name?.toLowerCase().includes('audio')
    || product?.category?.name?.toLowerCase().includes('phone')
    || product?.category?.name?.toLowerCase().includes('camera')
    || false;

  // --- Stock verification via polling (every 30s) ---
  const { stockMap: liveStockMap, lastUpdated: stockLastUpdated, refresh: refreshLiveStock } = useStockRefresh(
    product ? [product.id] : [],
    { pollInterval: 30000, useVisibilityObserver: true }
  );

  // Get live stock for current product
  const liveStock = product ? liveStockMap.get(product.id)?.stock : undefined;
  const effectiveStock = liveStock ?? product?.stock ?? 0;

  // --- Handlers ---
  const handleAddToCart = async () => {
    if (!product) return;
    setStockVerifying(true);

    try {
      // Verify stock is still available before adding to cart
      const res = await fetch(`/api/products/${product.id}`);
      if (res.ok) {
        const freshProduct = await res.json();
        const currentStock = freshProduct.stock;
        setVerifiedStock(currentStock);
        setProduct(freshProduct);

        if (currentStock === 0) {
          sonnerToast.error('Out of Stock', {
            description: `${product.name} is no longer available in stock.`,
            duration: 4000,
          });
          return;
        }
        if (quantity > currentStock) {
          sonnerToast.warning('Limited Stock', {
            description: `Only ${currentStock} ${currentStock === 1 ? 'item is' : 'items are'} available. Adjusting your quantity.`,
            duration: 4000,
          });
          setQuantity(currentStock);
          addItem({
            productId: freshProduct.id,
            name: freshProduct.name,
            price: freshProduct.price,
            comparePrice: freshProduct.comparePrice,
            quantity: currentStock,
            image: images[0]?.url || '/images/products/headphones.png',
            stock: currentStock,
          });
          setCartBouncing(true);
          setTimeout(() => setCartBouncing(false), 600);
          return;
        }
        addItem({
          productId: freshProduct.id,
          name: freshProduct.name,
          price: freshProduct.price,
          comparePrice: freshProduct.comparePrice,
          quantity,
          image: images[0]?.url || '/images/products/headphones.png',
          stock: currentStock,
        });
      } else {
        addItem({
          productId: product.id,
          name: product.name,
          price: product.price,
          comparePrice: product.comparePrice,
          quantity,
          image: images[0]?.url || '/images/products/headphones.png',
          stock: product.stock,
        });
      }
      setCartBouncing(true);
      setTimeout(() => setCartBouncing(false), 600);
      sonnerToast.success(`${quantity}x ${product.name} added to your cart`);
    } catch {
      sonnerToast.error('Failed to verify stock. Please try again.');
    } finally {
      setStockVerifying(false);
    }
  };

  const handleWishlistToggle = () => {
    if (!product) return;
    toggleWishlistItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      image: images[0]?.url || '/images/products/headphones.png',
      addedAt: Date.now(),
    });
    sonnerToast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleCompareToggle = () => {
    if (!product) return;
    toggleCompareItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      image: images[0]?.url || '/images/products/headphones.png',
      rating: product.rating,
      reviewCount: product.reviewCount,
      brand: product.brand,
      stock: product.stock,
      category: product.category?.name || '',
      description: product.shortDesc || product.description,
    });
  };

  const handleNotifyMe = () => {
    if (!product) return;
    addStockAlert({
      productId: product.id,
      productName: product.name,
      productImage: images[0]?.url || '/images/products/headphones.png',
    });
    sonnerToast.success("We'll notify you when this product is back in stock!");
  };

  const handleBuyNow = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      quantity,
      image: images[0]?.url || '/images/products/headphones.png',
      stock: effectiveStock,
    });
    sonnerToast.success(`${quantity}x ${product.name} added to your cart`);
    setView({ type: 'checkout' });
  };

  const handleQuantityChange = (delta: number) => {
    if (!product) return;
    setQuantity((prev) => Math.min(Math.max(prev + delta, 1), effectiveStock));
  };

  const handleSubmitReview = async () => {
    if (
      !reviewForm.userName.trim() ||
      reviewForm.rating === 0 ||
      !reviewForm.comment.trim()
    ) {
      sonnerToast.error('Please fill in all required fields: name, rating, and comment.');
      return;
    }
    if (!product) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      });

      if (!res.ok) {
        let errorData: any = { error: 'Failed' };
        try {
          errorData = await res.json();
        } catch {
          errorData = { error: `Server error (${res.status})` };
        }
        const customError = new Error(errorData.error || 'Failed to submit review') as any;
        customError.details = errorData.details;
        throw customError;
      }
      
      sonnerToast.success('Review submitted! Thank you for your feedback.');
      setReviewForm({ userName: '', rating: 0, title: '', comment: '' });
      // Refresh product to get updated rating
      const productRes = await fetch(`/api/products/${product.id}`);
      if (productRes.ok) {
        const data = await productRes.json();
        setProduct(data);
      }
      fetchReviews(1);
    } catch (err: any) {
      console.error('Review submission error:', err)
      const message = err.details || err.message || 'Product service is currently unavailable';
      sonnerToast.error(`Review Failed: ${message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // --- Render: Star rating display ---
  const renderStars = (rating: number, size: string = 'h-4 w-4') => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-muted text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  // --- Render: Interactive star selector ---
  const renderStarSelector = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() =>
              setReviewForm((prev) => ({
                ...prev,
                rating: prev.rating === star ? 0 : star,
              }))
            }
            className="p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            <Star
              className={`h-6 w-6 ${
                star <= reviewForm.rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-muted text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
        {reviewForm.rating > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">
            {reviewForm.rating} star{reviewForm.rating !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  };

  // --- Render: Stock status ---
  const renderStockStatus = () => {
    if (!product) return null;
    const stock = effectiveStock;
    if (stock === 0) {
      return (
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Out of Stock</span>
        </div>
      );
    }
    if (stock <= 5) {
      return (
        <div className="flex items-center gap-2 text-amber-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Only {stock} left in stock</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-green-600">
        <Check className="h-4 w-4" />
        <span className="text-sm font-medium">In Stock</span>
      </div>
    );
  };

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Back button skeleton */}
        <Skeleton className="h-10 w-28" />

        {/* Breadcrumb skeleton */}
        <Skeleton className="h-5 w-64" />

        {/* Main layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Image skeleton */}
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={`thumb-sk-${i}`} className="w-20 h-20 rounded-md" />
              ))}
            </div>
          </div>

          {/* Info skeleton */}
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // --- Not found ---
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Button variant="ghost" onClick={goBack} className="mb-6">
          <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
          Back
        </Button>
        <Card className="p-12 text-center">
          <AlertCircle className="h-20 w-20 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            The product you are looking for does not exist or has been removed.
          </p>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setView({ type: 'home' })}
          >
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  // --- Main render ---
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Back button */}
      <Button variant="ghost" onClick={goBack} className="gap-1">
        <ChevronRight className="h-4 w-4 rotate-180" />
        Back
      </Button>

      {/* Breadcrumb */}
      <Breadcrumb>
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
          {product.category && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setView({
                      type: 'products',
                      categoryId: product.categoryId,
                    });
                  }}
                >
                  {product.category.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1 max-w-[200px] sm:max-w-xs">
              {product.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Product Section: Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-3 space-y-4">
          {/* Main image */}
          <div
            ref={mainImageRef}
            className="relative aspect-square overflow-hidden rounded-lg bg-muted cursor-zoom-in group/img"
            onMouseMove={handleImageMouseMove}
            onMouseEnter={handleImageMouseEnter}
            onMouseLeave={handleImageMouseLeave}
            onClick={() => {
              setLightboxIndex(selectedImageIndex);
              setLightboxOpen(true);
            }}
          >
            <Image
              src={images[selectedImageIndex]?.url || '/images/products/headphones.png'}
              alt={images[selectedImageIndex]?.alt || product.name}
              fill
              className={`object-cover transition-transform duration-200 ease-out select-none ${
                isZooming ? 'scale-[2]' : 'scale-100'
              }`}
              style={isZooming ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : undefined}
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
            {discount > 0 && (
              <Badge className="absolute top-3 left-3 bg-red-500 text-white hover:bg-red-600 text-sm px-2.5 py-1 z-10">
                -{discount}%
              </Badge>
            )}
            {/* Click to expand hint overlay */}
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover/img:bg-black/10 transition-colors duration-200 pointer-events-none">
              <div className="flex items-center gap-2 text-white opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 bg-black/50 rounded-lg px-3 py-2 backdrop-blur-sm">
                <Maximize className="h-4 w-4" />
                <span className="text-sm font-medium">Click to expand</span>
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {images.map((img, index) => (
                <button
                  key={`thumb-nav-${index}`}
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setLightboxIndex(index);
                  }}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    index === selectedImageIndex
                      ? 'border-blue-600 ring-2 ring-blue-600/30'
                      : 'border-border hover:border-blue-300'
                  }`}
                >
                  <Image
                    src={img.url || '/images/products/headphones.png'}
                    alt={img.alt || `Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              {product.brand}
            </p>
          )}

          {/* Product name */}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          <button
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            onClick={scrollToReviews}
          >
            {renderStars(product.rating, 'h-4 w-4')}
            <span className="text-sm font-medium">{product.rating}</span>
            <span className="text-sm text-muted-foreground group-hover:text-blue-600 transition-colors">
              ({product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''})
            </span>
          </button>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.comparePrice)}
                </span>
                <Badge className="bg-red-500 text-white hover:bg-red-600">
                  Save {discount}%
                </Badge>
              </>
            )}
          </div>

          {/* Short description */}
          {product.shortDesc && (
            <p className="text-muted-foreground leading-relaxed">
              {product.shortDesc}
            </p>
          )}

          <Separator />

          {/* Stock status */}
          {renderStockStatus()}
          {stockLastUpdated && (
            <p className="text-xs text-muted-foreground">
              Stock updated {stockLastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          {/* Estimated delivery */}
          {effectiveStock > 0 && (
            <div className="flex items-center gap-2.5 rounded-lg bg-green-50 px-3.5 py-2.5 dark:bg-green-950/30">
              <Truck className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Estimated delivery: {getEstimatedDelivery().min} – {getEstimatedDelivery().max}
              </span>
            </div>
          )}

          {/* Quantity selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Quantity:</span>
            <div className="flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-r-none"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                max={effectiveStock}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= effectiveStock) {
                    setQuantity(val);
                  }
                }}
                className="h-10 w-14 text-center border-x-0 rounded-none focus-visible:ring-0 focus-visible:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-l-none"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= effectiveStock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Color:</span>
            <div className="flex items-center gap-2.5">
              {availableColors.map((color) => (
                <motion.button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className="relative h-8 w-8 rounded-full border-2 border-muted-foreground/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  style={{ backgroundColor: color.hex }}
                  whileTap={{ scale: 0.9 }}
                >
                  {selectedColor === color.name && (
                    <motion.div
                      layoutId="colorRing"
                      className="absolute inset-0 rounded-full ring-2 ring-blue-600 ring-offset-2"
                      initial={false}
                      animate={{ scale: 1.15 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const color = availableColors.find(c => c.name === selectedColor)
                if (!color) return ''
                return color.name.charAt(0).toUpperCase() + color.name.slice(1)
              })()}
            </p>
          </div>

          {/* Size Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Size:</span>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                <Ruler className="h-3.5 w-3.5" />
                Size Guide
              </button>
            </div>
            <div className="flex items-center gap-2">
              {SIZES.map((size) => (
                <motion.button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`h-9 min-w-[2.5rem] rounded-md border text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    selectedSize === size
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-border hover:border-blue-300 text-foreground'
                  }`}
                  whileTap={{ scale: 0.9 }}
                >
                  {size}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Selected Options Summary */}
          <p className="text-xs text-muted-foreground">
            Selected: {(() => {
              const color = availableColors.find(c => c.name === selectedColor)
              const colorName = color ? color.name.charAt(0).toUpperCase() + color.name.slice(1) : ''
              return `${colorName} · Size ${selectedSize}`
            })()}
          </p>

          {/* Key Features Badges */}
          <div className="flex flex-wrap gap-2">
            {effectiveStock > 5 && (
              <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-900 gap-1.5 px-3 py-1">
                <PackageCheck className="h-3.5 w-3.5" />
                In Stock
              </Badge>
            )}
            {product.rating >= 4 && (
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900 gap-1.5 px-3 py-1">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                Top Rated
              </Badge>
            )}
            {product.comparePrice && discount > 0 && (
              <Badge variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900 gap-1.5 px-3 py-1">
                <Tag className="h-3.5 w-3.5" />
                {discount}% Off
              </Badge>
            )}
            {product.brand && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-border gap-1.5 px-3 py-1">
                <User className="h-3.5 w-3.5" />
                by {product.brand}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {effectiveStock > 0 ? (
              <>
                <motion.div
                  className="flex-1"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Button
                    className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold"
                    onClick={handleAddToCart}
                    disabled={product.stock === 0 || stockVerifying}
                  >
                    <AnimatePresence mode="wait">
                      {cartBouncing ? (
                        <motion.span
                          key="bouncing"
                          initial={{ y: 0 }}
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          className="inline-flex items-center mr-2"
                        >
                          <ShoppingCart className="h-5 w-5" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="static"
                          initial={{ scale: 1 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center mr-2"
                        >
                          <ShoppingCart className="h-5 w-5" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    Add to Cart
                  </Button>
                </motion.div>
                <Button
                  variant="outline"
                  className="h-12 flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 text-base font-semibold"
                  onClick={handleBuyNow}
                >
                  Buy Now
                </Button>
              </>
            ) : notified ? (
              <Button
                variant="secondary"
                className="h-12 text-base font-semibold"
                disabled
              >
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                You&apos;ll be Notified ✓
              </Button>
            ) : (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Button
                  variant="outline"
                  className="h-12 border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 text-base font-semibold"
                  onClick={handleNotifyMe}
                >
                  <Bell className="h-5 w-5 mr-2" />
                  Notify Me When Available
                </Button>
              </motion.div>
            )}
            <Button
              variant="ghost"
              className={`gap-2 ${
                wishlisted
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-muted-foreground hover:text-red-500'
              }`}
              onClick={handleWishlistToggle}
            >
              <Heart
                className={`h-5 w-5 transition-all duration-200 ${wishlisted ? 'fill-red-500 scale-110' : ''}`}
              />
              {wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            </Button>
            <Button
              variant="ghost"
              className={`gap-2 ${
                inCompare
                  ? 'text-blue-500 hover:text-blue-600'
                  : 'text-muted-foreground hover:text-blue-500'
              }`}
              onClick={handleCompareToggle}
            >
              <GitCompareArrows className="h-5 w-5" />
              {inCompare ? 'Remove from Compare' : 'Add to Compare'}
            </Button>

            {/* Share button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShareOpen(!shareOpen)}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              {shareOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 rounded-lg border bg-popover p-2 shadow-lg">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleShareFacebook}
                        className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                        title="Share on Facebook"
                      >
                        <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </button>
                      <button
                        onClick={handleShareTwitter}
                        className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                        title="Share on X (Twitter)"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </button>
                      <button
                        onClick={handleShareWhatsApp}
                        className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                        title="Share on WhatsApp"
                      >
                        <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </button>
                      <div className="w-px h-5 bg-border mx-0.5" />
                      <button
                        onClick={handleCopyLink}
                        className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                        title="Copy link"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Shipping & Return info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span>Free shipping on orders over $50</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RotateCcw className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span>30-day return policy</span>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description, Reviews & Specifications Tabs */}
      <div ref={reviewsTabRef}>
        <Tabs defaultValue="description" className="w-full">
          <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm border-b shadow-sm transition-shadow duration-200 -mx-4 px-4 sm:-mx-6 sm:px-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="description" className="px-4 sm:px-6">
                Description
              </TabsTrigger>
              <TabsTrigger value="specifications" className="px-4 sm:px-6">
                Specifications
              </TabsTrigger>
              <TabsTrigger value="qa" className="px-4 sm:px-6">
                Q&A
              </TabsTrigger>
              <TabsTrigger value="reviews" className="px-4 sm:px-6" onClick={() => fetchReviews(1)}>
                Reviews ({product.reviewCount})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="prose prose-sm sm:prose max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="p-0 sm:p-6">
                {/* Desktop table layout */}
                <div className="hidden sm:block">
                  <Table>
                    <TableBody>
                      <TableRow className="even:bg-muted/30">
                        <TableCell className="text-muted-foreground font-medium w-[200px]">Brand</TableCell>
                        <TableCell className="font-medium">{product.brand || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow className="even:bg-muted/30">
                        <TableCell className="text-muted-foreground font-medium">Category</TableCell>
                        <TableCell className="font-medium">{product.category?.name || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow className="even:bg-muted/30">
                        <TableCell className="text-muted-foreground font-medium">Price</TableCell>
                        <TableCell className="font-medium">{formatPrice(product.price)}</TableCell>
                      </TableRow>
                      <TableRow className="even:bg-muted/30">
                        <TableCell className="text-muted-foreground font-medium">Compare Price</TableCell>
                        <TableCell className="font-medium">{product.comparePrice ? formatPrice(product.comparePrice) : 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow className="even:bg-muted/30">
                        <TableCell className="text-muted-foreground font-medium">Discount</TableCell>
                        <TableCell className="font-medium">{discount > 0 ? `${discount}%` : 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow className="even:bg-muted/30">
                        <TableCell className="text-muted-foreground font-medium">Availability</TableCell>
                        <TableCell className="font-medium">
                          {product.stock > 0 ? (
                            <span className="text-green-600">In Stock ({product.stock})</span>
                          ) : (
                            <span className="text-red-500">Out of Stock</span>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow className="even:bg-muted/30">
                        <TableCell className="text-muted-foreground font-medium">Rating</TableCell>
                        <TableCell className="font-medium">{product.rating} / 5 ({product.reviewCount} reviews)</TableCell>
                      </TableRow>
                      <TableRow className="even:bg-muted/30">
                        <TableCell className="text-muted-foreground font-medium">Tags</TableCell>
                        <TableCell className="font-medium">{tags.length > 0 ? tags.join(', ') : 'None'}</TableCell>
                      </TableRow>
                      <TableRow className="even:bg-muted/30">
                        <TableCell className="text-muted-foreground font-medium">SKU</TableCell>
                        <TableCell className="font-medium">{product.id.substring(0, 8).toUpperCase()}</TableCell>
                      </TableRow>
                      {isElectronics && (
                        <>
                          <TableRow className="even:bg-muted/30">
                            <TableCell className="text-muted-foreground font-medium">Warranty</TableCell>
                            <TableCell className="font-medium">1 Year Manufacturer Warranty</TableCell>
                          </TableRow>
                          <TableRow className="even:bg-muted/30">
                            <TableCell className="text-muted-foreground font-medium">Return Policy</TableCell>
                            <TableCell className="font-medium">30 Days Free Returns</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile definition list layout */}
                <div className="sm:hidden divide-y divide-border">
                  {[
                    ['Brand', product.brand || 'N/A'],
                    ['Category', product.category?.name || 'N/A'],
                    ['Price', formatPrice(product.price)],
                    ['Compare Price', product.comparePrice ? formatPrice(product.comparePrice) : 'N/A'],
                    ['Discount', discount > 0 ? `${discount}%` : 'N/A'],
                    ['Availability', product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'],
                    ['Rating', `${product.rating} / 5 (${product.reviewCount} reviews)`],
                    ['Tags', tags.length > 0 ? tags.join(', ') : 'None'],
                    ['SKU', product.id.substring(0, 8).toUpperCase()],
                    ...(isElectronics ? [['Warranty', '1 Year Manufacturer Warranty'] as const, ['Return Policy', '30 Days Free Returns'] as const] : []),
                  ].map(([key, value]) => (
                    <div key={key} className="flex justify-between py-3 px-4 even:bg-muted/30">
                      <span className="text-muted-foreground font-medium text-sm">{key}</span>
                      <span className="font-medium text-sm text-right ml-4">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qa" className="mt-6 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircleQuestion className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Questions & Answers</h3>
                </div>
                <ProductQA productId={product.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6 space-y-6">
            {/* Rating Breakdown Summary */}
            {breakdownLoaded ? (
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Left: Overall rating */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-5xl font-bold text-foreground">{product.rating}</span>
                      <div className="mt-2">{renderStars(product.rating, 'h-5 w-5')}</div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        Based on {reviewTotal || product.reviewCount} review{reviewTotal !== 1 && product.reviewCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {/* Right: Breakdown bars */}
                    <div className="space-y-2.5">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratingBreakdown[star] || 0;
                        const totalRatings = reviewTotal || product.reviewCount || 1;
                        const pct = Math.round((count / totalRatings) * 100);
                        return (
                          <div key={star} className="flex items-center gap-2.5">
                            <span className="text-sm font-medium w-10 text-right shrink-0">
                              {star} {star === 1 ? '★' : '★'}
                            </span>
                            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : reviewsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Skeleton className="h-12 w-20" />
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={`review-sk-${i}`} className="flex items-center gap-2.5">
                          <Skeleton className="h-4 w-10" />
                          <Skeleton className="h-2.5 flex-1" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Write a Review Form */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Your name"
                      value={reviewForm.userName}
                      onChange={(e) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          userName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Rating <span className="text-red-500">*</span>
                    </label>
                    {renderStarSelector()}
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Title
                    </label>
                    <Input
                      placeholder="Summary of your review"
                      value={reviewForm.title}
                      onChange={(e) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Comment <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      placeholder="Share your experience with this product..."
                      rows={4}
                      value={reviewForm.comment}
                      onChange={(e) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          comment: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reviews list */}
            <div className="space-y-4">
              {reviewsLoading ? (
                // Review loading skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={`review-card-sk-${i}`}>
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))
              ) : reviews.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Star className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Be the first to share your experience with this product!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                            {(review.userName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {review.userName}
                              </span>
                              {review.verified && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs gap-1 bg-green-50 text-green-700 border-green-200"
                                >
                                  <Check className="h-3 w-3" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString(
                                'en-US',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                }
                              )}
                            </span>
                          </div>
                        </div>
                        {renderStars(review.rating, 'h-3.5 w-3.5')}
                      </div>

                      {review.title && (
                        <h4 className="font-semibold text-sm mb-1">
                          {review.title}
                        </h4>
                      )}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.comment}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Reviews pagination */}
            {!reviewsLoading && reviewTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewPage <= 1}
                  onClick={() => fetchReviews(reviewPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  Page {reviewPage} of {reviewTotalPages} ({reviewTotal} reviews)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewPage >= reviewTotalPages}
                  onClick={() => fetchReviews(reviewPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Frequently Bought Together */}
      {product.categoryId && (
        <FrequentlyBoughtTogether
          categoryId={product.categoryId}
          productId={product.id}
        />
      )}

      {/* Product Video Section */}
      <ProductVideoSection
        productId={product.id}
        productName={product.name}
      />

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">You May Also Like</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin items-stretch">
            {relatedProducts.map((rp) => (
              <div
                key={rp.id}
                className="flex-shrink-0 w-[220px] sm:w-[240px] snap-start"
              >
                <ProductCard product={rp} onQuickView={setQuickViewProduct} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        key={lightboxIndex}
        images={images.map((img) => ({ url: img.url, alt: img.alt }))}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />

      {/* Size Guide Modal */}
      <SizeGuideModal
        open={sizeGuideOpen}
        onOpenChange={setSizeGuideOpen}
      />

      <QuickViewModal
        product={quickViewProduct}
        open={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
