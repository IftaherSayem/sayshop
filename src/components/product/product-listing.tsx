'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { ProductCard } from "./product-card";
import { QuickViewModal } from "./quick-view-modal";
import { formatPrice, getDiscountPercentage, parseImages } from "@/lib/types";
import type { Product, Category } from "@/lib/types";
import { useUIStore } from "@/stores/ui-store";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useCompareStore } from "@/stores/compare-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeRefetch } from "@/hooks/use-supabase-realtime";
import { motion } from "framer-motion";
import Image from "next/image";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import {
  Search,
  SlidersHorizontal,
  X,
  Grid3X3,
  List,
  RotateCcw,
  Star,
  PackageOpen,
  Loader2,
  ShoppingCart,
  Heart,
  Eye,
  GitCompareArrows,
  Truck,
} from "lucide-react";

interface ProductListingProps {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
}

const PRODUCTS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Avg. Rating" },
  { value: "popular", label: "Most Popular" },
];

const PRICE_SLIDER_MAX = 1000;

const RATING_FILTERS = [
  { value: 4, label: "4+ Stars" },
  { value: 3, label: "3+ Stars" },
  { value: 2, label: "2+ Stars" },
];

type ViewMode = "grid" | "list";

interface FilterState {
  selectedCategories: string[];
  priceMin: number;
  priceMax: number;
  selectedBrands: string[];
  minRating: number | null;
  search: string;
  sort: string;
  page: number;
}

const initialFilters: FilterState = {
  selectedCategories: [],
  priceMin: 0,
  priceMax: PRICE_SLIDER_MAX,
  selectedBrands: [],
  minRating: null,
  search: "",
  sort: "newest",
  page: 1,
};

export function ProductListing({
  categoryId: propCategoryId,
  categorySlug: propCategorySlug,
  search: propSearch,
  sort: propSort,
  minPrice: propMinPrice,
  maxPrice: propMaxPrice,
}: ProductListingProps) {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [resolvedCategoryId, setResolvedCategoryId] = useState<string | undefined>(propCategoryId);
  const [filters, setFilters] = useState<FilterState>({
    ...initialFilters,
    search: propSearch || "",
    sort: propSort || "newest",
    selectedCategories: propCategoryId ? [propCategoryId] : [],
  });
  const [categories, setCategories] = useState<(Category & { productCount: number })[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(propSearch || "");
  const [debouncedSearch, setDebouncedSearch] = useState(propSearch || "");
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Realtime refetch trigger
  const [realtimeTick, setRealtimeTick] = useState(0);
  useRealtimeRefetch({
    table: 'products',
    enabled: true,
    refetch: useCallback(() => setRealtimeTick((t) => t + 1), []),
  });

  // Store hooks for list view
  const addItem = useCartStore((s) => s.addItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const toggleWishlistItem = useWishlistStore((s) => s.toggleItem);
  const isInCompare = useCompareStore((s) => s.isInCompare);
  const toggleCompareItem = useCompareStore((s) => s.toggleItem);
  const setView = useUIStore((s) => s.setView);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync debounced search into filters
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: debouncedSearch,
      page: 1,
    }));
  }, [debouncedSearch]);

  // Sync propCategoryId changes into filters state
  useEffect(() => {
    setResolvedCategoryId(propCategoryId);
    setFilters((prev) => ({
      ...prev,
      selectedCategories: propCategoryId ? [propCategoryId] : [],
      page: 1,
    }));
  }, [propCategoryId]);

  // Resolve categorySlug to categoryId when provided
  useEffect(() => {
    if (!propCategorySlug) return;
    // Try to find the category from the already loaded categories list
    const match = categories.find((c) => c.slug === propCategorySlug);
    if (match) {
      setResolvedCategoryId(match.id);
      setFilters((prev) => ({
        ...prev,
        selectedCategories: [match.id],
        page: 1,
      }));
    }
  }, [propCategorySlug, categories]);

  // Sync propSearch changes into filters state
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: propSearch || "",
      page: 1,
    }));
  }, [propSearch]);

  // Sync propSort changes into filters state
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      sort: propSort || "newest",
      page: 1,
    }));
  }, [propSort]);

  // Fetch categories
  useEffect(() => {
    let cancelled = false;
    async function fetchCategories() {
      setIsCategoriesLoading(true);
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCategories(data);
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setIsCategoriesLoading(false);
      }
    }
    fetchCategories();
    return () => { cancelled = true; };
  }, []);

  // Build query params from filters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(filters.page));
    params.set("limit", String(PRODUCTS_PER_PAGE));
    params.set("sort", filters.sort);

    if (filters.search) params.set("search", filters.search);

    // Use resolvedCategoryId (from prop or slug resolution) for API call
    const activeCategoryId = resolvedCategoryId || (filters.selectedCategories.length > 0 ? filters.selectedCategories[0] : undefined);
    if (activeCategoryId) {
      params.set("categoryId", activeCategoryId);
    }

    // Price range filter (only apply when not at extremes)
    if (filters.priceMin > 0) {
      params.set("minPrice", String(filters.priceMin));
    }
    if (filters.priceMax < PRICE_SLIDER_MAX) {
      params.set("maxPrice", String(filters.priceMax));
    }

    // Override with props if provided
    if (propMinPrice !== undefined) params.set("minPrice", String(propMinPrice));
    if (propMaxPrice !== undefined) params.set("maxPrice", String(propMaxPrice));

    return params;
  }, [filters, propMinPrice, propMaxPrice, resolvedCategoryId, realtimeTick]);

  // Fetch products
  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setProducts(data.products);
            setTotalProducts(data.total);
            setTotalPages(data.totalPages);

            // Extract unique brands from products for the brand filter
            const uniqueBrands = Array.from(
              new Set(
                data.products
                  .map((p: Product) => p.brand)
                  .filter(Boolean) as string[]
              )
            ).sort();
            setBrands(uniqueBrands);
          }
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchProducts();
    return () => { cancelled = true; };
  }, [queryParams]);

  // Update filters
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : value,
    }));
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setFilters((prev) => {
      const isSelected = prev.selectedCategories.includes(categoryId);
      return {
        ...prev,
        selectedCategories: isSelected
          ? prev.selectedCategories.filter((id) => id !== categoryId)
          : [categoryId], // Single select for category
        page: 1,
      };
    });
  }, []);

  const toggleBrand = useCallback((brand: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedBrands: prev.selectedBrands.includes(brand)
        ? prev.selectedBrands.filter((b) => b !== brand)
        : [...prev.selectedBrands, brand],
      page: 1,
    }));
  }, []);

  const setRatingFilter = useCallback((rating: number | null) => {
    setFilters((prev) => ({
      ...prev,
      minRating: prev.minRating === rating ? null : rating,
      page: 1,
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({ ...initialFilters, search: "", sort: "newest" });
    setSearchInput("");
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedCategories.length > 0) count++;
    if (filters.priceMin > 0 || filters.priceMax < PRICE_SLIDER_MAX) count++;
    if (filters.selectedBrands.length > 0) count++;
    if (filters.minRating !== null) count++;
    return count;
  }, [filters]);

  // Filter products by brand and rating (client-side since API doesn't support these)
  const filteredProducts = useMemo(() => {
    let result = products;
    if (filters.selectedBrands.length > 0) {
      result = result.filter(
        (p) => p.brand && filters.selectedBrands.includes(p.brand)
      );
    }
    if (filters.minRating !== null) {
      result = result.filter((p) => p.rating >= filters.minRating!);
    }
    return result;
  }, [products, filters.selectedBrands, filters.minRating]);

  // Get selected category name
  const selectedCategoryName = useMemo(() => {
    if (filters.selectedCategories.length === 0) return null;
    const cat = categories.find((c) => c.id === filters.selectedCategories[0]);
    return cat?.name || null;
  }, [filters.selectedCategories, categories]);

  // Price slider value
  const priceSliderValue: [number, number] = [filters.priceMin, filters.priceMax];
  const isPriceAtExtremes = filters.priceMin === 0 && filters.priceMax === PRICE_SLIDER_MAX;

  const handlePriceSliderChange = useCallback((value: number[]) => {
    const [min, max] = value;
    setFilters((prev) => ({
      ...prev,
      priceMin: min,
      priceMax: max,
      page: 1,
    }));
  }, []);

  // Generate page numbers for pagination
  const getPageNumbers = useCallback((current: number, total: number) => {
    const pages: (number | "ellipsis")[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("ellipsis");
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push("ellipsis");
      pages.push(total);
    }
    return pages;
  }, []);

  // Shared handlers for list view items
  const handleListAddToCart = useCallback((product: Product) => {
    const images = parseImages(product.images);
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
  }, [addItem]);

  const handleListWishlistToggle = useCallback((product: Product) => {
    const images = parseImages(product.images);
    const wishlisted = isInWishlist(product.id);
    toggleWishlistItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      image: images[0]?.url || "/images/products/headphones.png",
      addedAt: Date.now(),
    });
    toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist");
  }, [isInWishlist, toggleWishlistItem]);

  const handleListCompareToggle = useCallback((product: Product) => {
    const images = parseImages(product.images);
    toggleCompareItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      image: images[0]?.url || "/images/products/headphones.png",
      rating: product.rating,
      reviewCount: product.reviewCount,
      brand: product.brand,
      stock: product.stock,
      category: product.category?.name || "",
      description: product.shortDesc || product.description,
    });
  }, [toggleCompareItem]);

  const filterSidebarContent = (keyPrefix = 'desktop') => (
    <div className="space-y-6 pr-2">
      {/* Category Filter */}
      <div>
        <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider text-muted-foreground">
          Categories
        </h3>
        <ScrollArea className="max-h-52">
          <div className="space-y-2.5">
            {isCategoriesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={`${keyPrefix}-cat-skel-${i}`} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))
            ) : (
              categories.map((category) => (
                <label
                  key={`${keyPrefix}-cat-${category.id}`}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <Checkbox
                    checked={filters.selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                    className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <span className="text-sm group-hover:text-orange-600 transition-colors flex-1">
                    {category.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {category.productCount}
                  </span>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Price Range Slider */}
      <div>
        <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider text-muted-foreground">
          Price Range
        </h3>
        <div className="px-1">
          <Slider
            min={0}
            max={PRICE_SLIDER_MAX}
            step={10}
            value={priceSliderValue}
            onValueChange={handlePriceSliderChange}
            className="w-full"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium text-foreground">
              {formatPrice(filters.priceMin)}
            </span>
            <span className="text-xs text-muted-foreground">—</span>
            <span className="text-sm font-medium text-foreground">
              {isPriceAtExtremes ? "Any" : formatPrice(filters.priceMax)}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Brand Filter */}
      <div>
        <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider text-muted-foreground">
          Brands
        </h3>
        <ScrollArea className="max-h-48">
          <div className="space-y-2.5">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={`${keyPrefix}-brand-skel-${i}`} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            ) : brands.length === 0 ? (
              <p className="text-xs text-muted-foreground">No brands available</p>
            ) : (
              brands.map((brand) => (
                <label
                  key={`${keyPrefix}-brand-${brand}`}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <Checkbox
                    checked={filters.selectedBrands.includes(brand)}
                    onCheckedChange={() => toggleBrand(brand)}
                    className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <span className="text-sm group-hover:text-orange-600 transition-colors">
                    {brand}
                  </span>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Rating Filter */}
      <div>
        <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider text-muted-foreground">
          Rating
        </h3>
        <div className="space-y-2.5">
          {RATING_FILTERS.map((rating) => (
            <label
              key={`${keyPrefix}-rating-${rating.value}`}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <Checkbox
                checked={filters.minRating === rating.value}
                onCheckedChange={() => setRatingFilter(rating.value)}
                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={`${keyPrefix}-star-${rating.value}-${i}`}
                    className={`h-3.5 w-3.5 ${
                      i < rating.value
                        ? "fill-amber-400 text-amber-400"
                        : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm group-hover:text-orange-600 transition-colors">
                {rating.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Clear All Filters */}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-muted-foreground hover:text-foreground"
        onClick={clearAllFilters}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Clear All Filters
      </Button>
    </div>
  );

  // Product Grid Skeleton
  const ProductGridSkeleton = () => (
    viewMode === "grid" ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={`grid-sk-${i}`} className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-3.5 w-3.5 rounded" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-5 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={`list-sk-${i}`} className="overflow-hidden">
            <div className="flex">
              <Skeleton className="w-[200px] h-[200px] shrink-0" />
              <CardContent className="flex-1 p-4 space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-9 w-32" />
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    )
  );

  // Empty State
  const EmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 flex items-center justify-center">
          <PackageOpen className="h-14 w-14 text-orange-400/70" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
          <Search className="h-4 w-4 text-orange-500" />
        </div>
      </div>
      <h3 className="text-xl font-bold mb-2">No products found</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-md leading-relaxed">
        We couldn&apos;t find any products matching your criteria. Try adjusting your
        filters or search terms to discover what you&apos;re looking for.
      </p>
      <Button
        variant="outline"
        onClick={clearAllFilters}
        className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-all duration-200"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset All Filters
      </Button>
    </motion.div>
  );

  // Product List Item (for list view)
  const ProductListItem = ({ product }: { product: Product }) => {
    const images = parseImages(product.images);
    const discount = product.comparePrice
      ? getDiscountPercentage(product.price, product.comparePrice)
      : 0;
    const wishlisted = isInWishlist(product.id);
    const inCompare = isInCompare(product.id);
    const hasFreeShipping = product.price >= 50;

    return (
      <Card
        className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg border border-border/50"
        onClick={() => setView({ type: "product-detail", productId: product.id })}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full sm:w-[200px] sm:min-w-[200px] aspect-square sm:aspect-auto overflow-hidden bg-muted">
            <Image
              src={images[0]?.url || "/images/products/headphones.png"}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 200px"
            />
            {discount > 0 && (
              <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600 -rotate-1 z-[5]">
                -{discount}%
              </Badge>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <Badge className="absolute top-2 right-2 bg-amber-500 text-white hover:bg-amber-600 z-[5]">
                Only {product.stock} left
              </Badge>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1">
                  {product.brand && (
                    <p className="text-xs text-muted-foreground mb-0.5">{product.brand}</p>
                  )}
                  <h3 className="font-medium text-base sm:text-lg group-hover:text-orange-600 transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); setQuickViewProduct(product); }}
                    aria-label="Quick view"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 transition-colors duration-200 ${wishlisted ? 'text-red-500 hover:text-red-600' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleListWishlistToggle(product); }}
                    aria-label="Toggle wishlist"
                  >
                    <Heart className={`h-4 w-4 ${wishlisted ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 transition-colors duration-200 ${inCompare ? 'text-blue-500 hover:text-blue-600' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleListCompareToggle(product); }}
                    aria-label="Toggle compare"
                  >
                    <GitCompareArrows className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-2">
                <div className="flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium">{product.rating}</span>
                  <span className="text-sm text-muted-foreground">({product.reviewCount})</span>
                </div>
                {product.category && (
                  <>
                    <span className="text-muted-foreground mx-1">·</span>
                    <span className="text-sm text-muted-foreground">{product.category.name}</span>
                  </>
                )}
              </div>

              {/* Short Description */}
              {product.shortDesc && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {product.shortDesc}
                </p>
              )}
            </div>

            {/* Price + Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl">{formatPrice(product.price)}</span>
                {product.comparePrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.comparePrice)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {hasFreeShipping && (
                  <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
                    <Truck className="h-3.5 w-3.5" />
                    <span className="text-xs">Free Shipping</span>
                  </div>
                )}
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={(e) => { e.stopPropagation(); handleListAddToCart(product); }}
                >
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // Determine breadcrumb context
  const breadcrumbContext = useMemo(() => {
    if (filters.search) {
      return { type: "search" as const, label: `Search: "${filters.search}"` };
    }
    if (selectedCategoryName) {
      return { type: "category" as const, label: selectedCategoryName };
    }
    if (filters.selectedBrands.length === 1) {
      return { type: "brand" as const, label: filters.selectedBrands[0] };
    }
    if (filters.selectedBrands.length > 1) {
      return { type: "brand" as const, label: `${filters.selectedBrands[0]} +${filters.selectedBrands.length - 1}` };
    }
    return null;
  }, [filters.search, selectedCategoryName, filters.selectedBrands]);

  // Determine page title
  const pageTitle = useMemo(() => {
    if (filters.search) return `Search Results for "${filters.search}"`;
    if (selectedCategoryName) return selectedCategoryName;
    if (filters.selectedBrands.length > 0) {
      return filters.selectedBrands.length === 1
        ? filters.selectedBrands[0]
        : `${filters.selectedBrands[0]} & ${filters.selectedBrands.length - 1} more`;
    }
    return "All Products";
  }, [filters.search, selectedCategoryName, filters.selectedBrands]);

  return (
    <div className="w-full">
      {/* Breadcrumb Navigation */}
      <div className="py-3">
        <Breadcrumb>
          <BreadcrumbList className="text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setView({ type: "home" });
                }}
                className="hover:text-orange-600"
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {breadcrumbContext ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-muted-foreground font-normal">
                    Products
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{breadcrumbContext.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>Products</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Page Title */}
      <motion.div
        className="mb-4"
        key={pageTitle}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold">
          {pageTitle}
          {!isLoading && (
            <span className="text-muted-foreground font-normal text-base ml-2">
              ({totalProducts} {totalProducts === 1 ? "product" : "products"} found)
            </span>
          )}
        </h1>
      </motion.div>

      {/* Search / Query Display Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {filters.search && (
          <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-sm">
            <Search className="h-3.5 w-3.5" />
            <span>
              Showing results for &lsquo;{filters.search}&rsquo;
            </span>
            <button
              onClick={clearSearch}
              className="hover:bg-orange-100 rounded-full p-0.5 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {selectedCategoryName && (
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {selectedCategoryName}
            <button
              onClick={() => updateFilter("selectedCategories", [])}
              className="ml-1.5 hover:text-destructive transition-colors"
              aria-label="Clear category"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.selectedBrands.map((brand) => (
          <Badge key={brand} variant="secondary" className="text-sm py-1 px-3">
            {brand}
            <button
              onClick={() => toggleBrand(brand)}
              className="ml-1.5 hover:text-destructive transition-colors"
              aria-label={`Remove ${brand} filter`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {filters.minRating !== null && (
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {filters.minRating}+ Stars
            <button
              onClick={() => setRatingFilter(null)}
              className="ml-1.5 hover:text-destructive transition-colors"
              aria-label="Clear rating filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {!isPriceAtExtremes && (
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {formatPrice(filters.priceMin)} – {formatPrice(filters.priceMax)}
            <button
              onClick={() => {
                updateFilter("priceMin", 0);
                updateFilter("priceMax", PRICE_SLIDER_MAX);
              }}
              className="ml-1.5 hover:text-destructive transition-colors"
              aria-label="Clear price filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      <div className="flex gap-6">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-64 shrink-0 hidden lg:block">
            <Card className="border-border/50 sticky top-24">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </h2>
                  {activeFilterCount > 0 && (
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>
                {filterSidebarContent('desktop')}
              </CardContent>
            </Card>
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            {/* Results count + Mobile filter button */}
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="relative"
                  onClick={() => setFilterSheetOpen(true)}
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  <>
                    Showing{" "}
                    <motion.span
                      key={filteredProducts.length}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="font-semibold text-foreground inline-block"
                    >
                      {filteredProducts.length}
                    </motion.span>{" "}
                    of{" "}
                    <motion.span
                      key={totalProducts}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="font-semibold text-foreground inline-block"
                    >
                      {totalProducts}
                    </motion.span>{" "}
                    {filteredProducts.length === 1 ? "product" : "products"}
                  </>
                )}
              </span>
            </div>

            {/* Sort Dropdown + View Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Sort by:
              </span>
              <Select
                value={filters.sort}
                onValueChange={(val) => updateFilter("sort", val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Grid / List View Toggle */}
              <div className="hidden sm:flex items-center border rounded-md overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-none ${viewMode === "grid" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-none ${viewMode === "list" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Product Grid/List or Empty State */}
          {isLoading ? (
            <ProductGridSkeleton />
          ) : filteredProducts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onQuickView={setQuickViewProduct} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProducts.map((product) => (
                    <ProductListItem key={product.id} product={product} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 mb-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (filters.page > 1) {
                              updateFilter("page", filters.page - 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className={
                            filters.page <= 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {getPageNumbers(filters.page, totalPages).map((page, idx) =>
                        page === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={page === filters.page}
                              onClick={(e) => {
                                e.preventDefault();
                                updateFilter("page", page);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (filters.page < totalPages) {
                              updateFilter("page", filters.page + 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className={
                            filters.page >= totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        open={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      {/* Mobile Filter Sheet */}
      {isMobile && (
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                Narrow down your search with filters
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6 pt-2">
              {filterSidebarContent('mobile')}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
