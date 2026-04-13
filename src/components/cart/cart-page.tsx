'use client'

import { useState, useMemo, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useCartStore } from "@/stores/cart-store"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { formatPrice } from "@/lib/types"
import type { Product } from "@/lib/types"
import { useStockRefresh } from "@/hooks/use-stock-refresh"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  Tag,
  Loader2,
  X,
  ShieldCheck,
  CircleDollarSign,
  RotateCcw,
  Clock,
  ShoppingCart,
  Sparkles,
  Coins,
  BookMarked,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  PackageX,
} from "lucide-react"
import { toast } from "sonner"
import { useRewardsStore } from "@/stores/rewards-store"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface CouponData {
  valid: boolean
  code: string
  discount: number
  minOrder?: number
  message: string
}

export function CartPage() {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const addItem = useCartStore((s) => s.addItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getShipping = useCartStore((s) => s.getShipping)
  const setView = useUIStore((s) => s.setView)
  const { isAuthenticated } = useAuthStore()

  // Wait for Zustand persist to hydrate before checking auth
  const hydrated = useAuthStore((s) => s._hydrated)

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      setView({ type: 'auth' })
    }
  }, [hydrated, isAuthenticated, setView])

  // Save for later
  const savedForLater = useCartStore((s) => s.savedForLater)
  const saveForLater = useCartStore((s) => s.saveForLater)
  const moveToCart = useCartStore((s) => s.moveToCart)
  const removeFromSaved = useCartStore((s) => s.removeFromSaved)

  // Rewards
  const rewardsPoints = useRewardsStore((s) => s.points)

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [savedExpanded, setSavedExpanded] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponData, setCouponData] = useState<CouponData | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")

  // Cross-sell state
  const [crossSellProducts, setCrossSellProducts] = useState<Product[]>([])
  const [crossSellLoading, setCrossSellLoading] = useState(false)

  // Stock refresh for cart items
  const cartProductIds = useMemo(() => items.map((i) => i.productId), [items])
  const { stockMap, isLoading: stockLoading, lastUpdated: stockLastUpdated, refresh: refreshStock } = useStockRefresh(cartProductIds, {
    pollInterval: 0, // Manual refresh only for cart page
    useVisibilityObserver: true,
  })

  // Determine stock issues for each cart item
  const stockIssues = useMemo(() => {
    const issues = new Map<string, { outOfStock: boolean; currentStock: number; quantityExceeds: boolean }>()
    for (const item of items) {
      const liveStock = stockMap.get(item.productId)
      if (liveStock) {
        issues.set(item.productId, {
          outOfStock: liveStock.stock === 0,
          currentStock: liveStock.stock,
          quantityExceeds: item.quantity > liveStock.stock,
        })
      }
    }
    return issues
  }, [items, stockMap])

  const hasStockIssues = useMemo(() => {
    for (const issue of stockIssues.values()) {
      if (issue.outOfStock || issue.quantityExceeds) return true
    }
    return false
  }, [stockIssues])

  // Refresh stock when cart items change
  useEffect(() => {
    if (items.length > 0) {
      refreshStock()
    }
  }, [items.length, refreshStock])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = getSubtotal()
  const shipping = getShipping()
  const freeShipping = subtotal > 50

  // Calculate discount
  const discount = useMemo(() => {
    if (!couponData || !couponData.valid) return 0
    const discountAmount = subtotal * (couponData.discount / 100)
    return discountAmount
  }, [couponData, subtotal])

  const tax = (subtotal - discount) * 0.08
  const total = subtotal - discount + shipping + tax

  // Select/deselect logic
  const allSelected = items.length > 0 && selectedItems.size === items.length
  const selectedCount = selectedItems.size

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map((i) => i.productId)))
    }
  }

  const handleSelectItem = (productId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handleDeleteSelected = () => {
    selectedItems.forEach((id) => removeItem(id))
    setSelectedItems(new Set())
    toast.success(`${selectedCount} item${selectedCount > 1 ? 's' : ''} removed from cart.`)
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return

    setCouponLoading(true)
    setCouponError("")

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      })
      const data = await res.json()

      if (data.valid) {
        if (data.minOrder && subtotal < data.minOrder) {
          setCouponError(`Minimum order of ${formatPrice(data.minOrder)} required.`)
          setCouponData(null)
        } else {
          setCouponData(data)
          toast.success("Coupon applied!", { description: data.message })
        }
      } else {
        setCouponError(data.error || "Invalid coupon code")
        setCouponData(null)
      }
    } catch {
      setCouponError("Failed to apply coupon")
      setCouponData(null)
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponData(null)
    setCouponCode("")
    setCouponError("")
  }

  const handleContinueShopping = () => {
    setView({ type: "products" })
  }

  const handleCheckout = () => {
    setView({ type: "checkout" })
  }

  const handleStartShopping = () => {
    setView({ type: "products" })
  }

  // --- Cross-sell product fetching ---
  const crossSellCartIds = useMemo(() => new Set(items.map((i) => i.productId)), [items])

  const fetchCrossSell = useCallback(async () => {
    setCrossSellLoading(true)
    try {
      const res = await fetch("/api/products?limit=8")
      if (!res.ok) return
      const data = await res.json()
      const products: Product[] = data.products || []
      const filtered = products.filter((p) => !crossSellCartIds.has(p.id))
      setCrossSellProducts(filtered)
    } catch {
      // silently ignore
    } finally {
      setCrossSellLoading(false)
    }
  }, [crossSellCartIds])

  useEffect(() => {
    if (items.length > 0) {
      fetchCrossSell()
    } else {
      setCrossSellProducts([])
    }
  }, [items.length, fetchCrossSell])

  const showCrossSell = items.length > 0 && crossSellProducts.length > 0

  const handleCrossSellAddToCart = (product: Product) => {
    const images = product.images ? JSON.parse(product.images) : []
    const imageUrl = (Array.isArray(images) && images[0]?.url) ? images[0].url : '/images/products/headphones.png'
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice,
      quantity: 1,
      image: imageUrl,
      stock: product.stock,
    })
    sonnerToast.success(`${product.name} added to cart`)
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <ShoppingCart className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                Shopping Cart
              </h1>
              {totalItems > 0 && (
                <p className="mt-0.5 text-sm text-orange-100">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
                </p>
              )}
            </div>
            {totalItems > 0 && (
              <Badge className="ml-auto hidden h-8 items-center gap-1.5 border-0 bg-white/20 px-3 text-sm font-semibold text-white backdrop-blur-sm sm:flex">
                <ShoppingBag className="h-4 w-4" />
                {totalItems}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setView({ type: "home" })
                  }}
                >
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Shopping Cart</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </nav>

        {/* Empty State */}
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed py-24 text-center"
          >
            <div className="relative">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30">
                <ShoppingBag className="h-16 w-16 text-orange-400/70" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
                <ArrowRight className="h-5 w-5 text-orange-500 rotate-[-45deg]" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Your cart is empty</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                Looks like you haven&apos;t added anything to your cart yet. Explore our products and find something you love!
              </p>
            </div>
            <Button onClick={handleStartShopping} className="mt-2 bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200 shadow-md shadow-orange-500/20">
              Start Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Stock Refresh Banner */}
            {hasStockIssues && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30"
              >
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Some items have stock issues
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Stock levels have changed since these items were added.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/50"
                  onClick={refreshStock}
                  disabled={stockLoading}
                >
                  {stockLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Refresh Stock
                </Button>
              </motion.div>
            )}

            {/* Cart Items - Left Column */}
            <div className="lg:col-span-2">
              {/* Select All + Delete Selected */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all items"
                  />
                  <span className="text-sm text-muted-foreground">
                    Select All ({items.length})
                  </span>
                </div>
                {selectedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete Selected ({selectedCount})
                  </Button>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-0 rounded-xl border">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.productId}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-4">
                        {/* Checkbox */}
                        <Checkbox
                          checked={selectedItems.has(item.productId)}
                          onCheckedChange={() => handleSelectItem(item.productId)}
                          className="mt-6 shrink-0 sm:mt-0"
                          aria-label={`Select ${item.name}`}
                        />

                        {/* Image */}
                        <div
                          className="h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-muted"
                          onClick={() => setView({ type: "product-detail", productId: item.productId })}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover transition-opacity hover:opacity-80"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <button
                            onClick={() => setView({ type: "product-detail", productId: item.productId })}
                            className="truncate text-left text-sm font-medium transition-colors hover:text-orange-500 sm:text-base"
                          >
                            {item.name}
                          </button>
                          {item.comparePrice && item.comparePrice > item.price && (
                            <Badge variant="secondary" className="w-fit text-xs">
                              {Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100)}% OFF
                            </Badge>
                          )}
                          {/* Stock Warning */}
                          {stockIssues.has(item.productId) && (() => {
                            const issue = stockIssues.get(item.productId)!
                            if (issue.outOfStock) {
                              return (
                                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                  <PackageX className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">Out of Stock</span>
                                </div>
                              )
                            }
                            if (issue.quantityExceeds) {
                              return (
                                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">Only {issue.currentStock} left (you have {item.quantity})</span>
                                </div>
                              )
                            }
                            if (issue.currentStock <= 5 && issue.currentStock > 0) {
                              return (
                                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">Only {issue.currentStock} left in stock</span>
                                </div>
                              )
                            }
                            return null
                          })()}
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(item.price)} each
                          </p>

                          {/* Quantity + Line Total + Remove - Mobile */}
                          <div className="mt-2 flex items-center justify-between sm:hidden">
                            <div className="flex items-center gap-0 rounded-md border">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="flex h-8 w-10 items-center justify-center border-x text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                                className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                              <button
                                onClick={() => {
                                  saveForLater(item.productId)
                                  sonnerToast.success(`${item.name} saved for later`)
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-orange-50 hover:text-orange-500"
                                aria-label={`Save ${item.name} for later`}
                              >
                                <BookMarked className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeItem(item.productId)}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quantity + Line Total + Remove - Desktop */}
                        <div className="hidden items-center gap-6 sm:flex">
                          {/* Quantity Selector */}
                          <div className="flex items-center gap-0 rounded-md border">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="flex h-9 w-12 items-center justify-center border-x text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Save for Later - Desktop */}
                          <button
                            onClick={() => {
                              saveForLater(item.productId)
                              sonnerToast.success(`${item.name} saved for later`)
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-orange-50 hover:text-orange-500"
                            aria-label={`Save ${item.name} for later`}
                            title="Save for Later"
                          >
                            <BookMarked className="h-4 w-4" />
                          </button>

                          {/* Line Total */}
                          <span className="min-w-[80px] text-right text-base font-semibold">
                            {formatPrice(item.price * item.quantity)}
                          </span>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <Separator />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Continue Shopping */}
              <div className="mt-6">
                <button
                  onClick={handleContinueShopping}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-orange-500"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Continue Shopping
                </button>
              </div>

              {/* Save for Later Section */}
              {savedForLater.length !== 0 && (
                <Collapsible open={savedExpanded} onOpenChange={setSavedExpanded} className="mt-6">
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <BookMarked className="h-5 w-5 text-orange-500" />
                        <span className="text-sm font-semibold">
                          Saved for Later ({savedForLater.length} {savedForLater.length === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: savedExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </button>
                  </CollapsibleTrigger>
                  <AnimatePresence>
                    {savedExpanded && (
                      <CollapsibleContent forceMount>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 space-y-2">
                            {savedForLater.map((item) => (
                              <motion.div
                                key={item.productId}
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-3 rounded-lg border bg-card p-3"
                              >
                                <div
                                  className="h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-md border bg-muted"
                                  onClick={() => setView({ type: "product-detail", productId: item.productId })}
                                >
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <button
                                    onClick={() => setView({ type: "product-detail", productId: item.productId })}
                                    className="truncate text-left text-sm font-medium transition-colors hover:text-orange-500"
                                  >
                                    {item.name}
                                  </button>
                                  <span className="text-sm font-semibold text-orange-500">
                                    {formatPrice(item.price)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => {
                                      moveToCart(item.productId)
                                      sonnerToast.success(`${item.name} moved to cart`)
                                    }}
                                  >
                                    Move to Cart
                                  </Button>
                                  <button
                                    onClick={() => removeFromSaved(item.productId)}
                                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={`Remove ${item.name}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      </CollapsibleContent>
                    )}
                  </AnimatePresence>
                </Collapsible>
              )}
            </div>

            {/* Order Summary - Right Column */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 sm:top-24">
                <Card className="overflow-hidden border-0 shadow-lg">
                  {/* Orange gradient border-left accent */}
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Rewards Card */}
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Rewards</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-xs text-amber-600/80 dark:text-amber-400/80">Points balance</span>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{rewardsPoints.toLocaleString()} pts</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-amber-600/80 dark:text-amber-400/80">You&apos;ll earn</span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">+{Math.floor(subtotal)} pts</span>
                      </div>
                      <button
                        className="mt-1.5 text-xs text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
                        onClick={() => {
                          sonnerToast.info(
                            'Earn 1 point per $1 spent. Points can be redeemed for discounts on future orders!',
                            { duration: 5000 }
                          )
                        }}
                      >
                        Learn More
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                      </span>
                      <span className="font-medium">{formatPrice(subtotal)}</span>
                    </div>

                    {/* Shipping */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      {freeShipping ? (
                        <span className="font-medium text-green-600">Free</span>
                      ) : (
                        <span className="font-medium">{formatPrice(shipping)}</span>
                      )}
                    </div>
                    {!freeShipping && (
                      <p className="text-xs text-muted-foreground">
                        Add {formatPrice(50.01 - subtotal)} more for free shipping!
                      </p>
                    )}

                    {/* Tax */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Tax</span>
                      <span className="font-medium">{formatPrice(tax)}</span>
                    </div>

                    {/* Coupon */}
                    <Separator />
                    <div>
                      {couponData ? (
                        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              {couponData.code} (-{couponData.discount}%)
                            </span>
                          </div>
                          <button
                            onClick={handleRemoveCoupon}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            aria-label="Remove coupon"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Coupon Code</label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter code"
                              value={couponCode}
                              onChange={(e) => {
                                setCouponCode(e.target.value)
                                setCouponError("")
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleApplyCoupon()
                              }}
                              className="h-9 flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleApplyCoupon}
                              disabled={couponLoading || !couponCode.trim()}
                              className="h-9 px-3"
                            >
                              {couponLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Apply"
                              )}
                            </Button>
                          </div>
                          {couponError && (
                            <p className="text-xs text-destructive">{couponError}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Animated Savings Badge */}
                    {discount > 0 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 dark:bg-green-950/50"
                      >
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          🎉 You save!
                        </span>
                        <motion.span
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                          className="text-sm font-bold text-green-700 dark:text-green-400"
                        >
                          -{formatPrice(discount)}
                        </motion.span>
                      </motion.div>
                    )}

                    {/* Discount */}
                    {discount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">Discount</span>
                        <span className="font-medium text-green-600">
                          -{formatPrice(discount)}
                        </span>
                      </div>
                    )}

                    <Separator />

                    {/* Total */}
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>

                    {/* Estimated Delivery */}
                    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0 text-orange-500" />
                      <span>Estimated delivery: <span className="font-medium text-foreground">3-5 business days</span></span>
                    </div>

                    {/* Checkout Button */}
                    <Button
                      className="w-full bg-orange-500 text-white hover:bg-orange-600"
                      size="lg"
                      onClick={handleCheckout}
                    >
                      Proceed to Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    {/* Security Badges */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-3 text-center">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        <span className="text-[10px] leading-tight font-medium text-muted-foreground">Secure Checkout</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-3 text-center">
                        <CircleDollarSign className="h-5 w-5 text-blue-600" />
                        <span className="text-[10px] leading-tight font-medium text-muted-foreground">Money-Back Guarantee</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-3 text-center">
                        <RotateCcw className="h-5 w-5 text-orange-500" />
                        <span className="text-[10px] leading-tight font-medium text-muted-foreground">Free Returns</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* You May Also Like Section - Loading Skeletons */}
        {items.length > 0 && crossSellLoading && (
          <div className="mt-12">
            <div className="mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold">You May Also Like</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`cart-rec-sk-${i}`} className="flex-shrink-0 w-48 sm:w-52">
                  <Card className="overflow-hidden">
                    <Skeleton className="aspect-square w-full" />
                    <CardContent className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-full rounded-md" />
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* You May Also Like Section - Dynamic Products */}
        {showCrossSell && (
          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold">You May Also Like</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {crossSellProducts.slice(0, 4).map((product) => {
                const images = product.images ? JSON.parse(product.images) : []
                const imageUrl = (Array.isArray(images) && images[0]?.url) ? images[0].url : '/images/products/headphones.png'
                return (
                  <motion.div
                    key={product.id}
                    className="flex-shrink-0 w-48 sm:w-52"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md">
                      <div
                        className="aspect-square overflow-hidden bg-muted"
                        onClick={() => setView({ type: "product-detail", productId: product.id })}
                      >
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-3 space-y-2">
                        <p
                          className="truncate text-sm font-medium transition-colors hover:text-orange-500"
                          onClick={() => setView({ type: "product-detail", productId: product.id })}
                        >
                          {product.name}
                        </p>
                        <p className="text-sm font-bold text-orange-500">
                          {formatPrice(product.price)}
                        </p>
                        <Button
                          className="w-full bg-orange-500 text-white hover:bg-orange-600 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCrossSellAddToCart(product)
                          }}
                        >
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  )
}
