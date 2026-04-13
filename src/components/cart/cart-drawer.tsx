'use client'

import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useEffect } from "react"
import { useCartStore } from "@/stores/cart-store"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { formatPrice } from "@/lib/types"
import { useStockRefresh } from "@/hooks/use-stock-refresh"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, AlertTriangle, RefreshCw, Loader2, PackageX } from "lucide-react"

function FreeShippingProgressBar({ subtotal }: { subtotal: number }) {
  const FREE_SHIPPING_THRESHOLD = 50
  const progress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)
  const isQualified = subtotal >= FREE_SHIPPING_THRESHOLD
  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        {isQualified ? (
          <span className="text-green-600 font-medium">
            🎉 You qualify for free shipping!
          </span>
        ) : (
          <span className="text-muted-foreground">
            Add <span className="font-semibold text-foreground">{formatPrice(remaining)}</span> more for free shipping
          </span>
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full transition-colors duration-300"
          initial={false}
          animate={{
            width: `${progress}%`,
            backgroundColor: isQualified ? "#16a34a" : undefined,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            background: isQualified
              ? undefined
              : "linear-gradient(90deg, #f97316, #ea580c)",
          }}
        />
      </div>
    </div>
  )
}

export function CartDrawer() {
  const items = useCartStore((s) => s.items)
  const isOpen = useCartStore((s) => s.isOpen)
  const closeCart = useCartStore((s) => s.closeCart)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getShipping = useCartStore((s) => s.getShipping)
  const setView = useUIStore((s) => s.setView)
  const { isAuthenticated } = useAuthStore()

  // Redirect to login if not authenticated when cart is opened
  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      closeCart()
      setView({ type: 'auth' })
    }
  }, [isOpen, isAuthenticated, closeCart, setView])

  // Stock refresh for cart items
  const cartProductIds = useMemo(() => items.map((i) => i.productId), [items])
  const { stockMap, isLoading: stockLoading, refresh: refreshStock } = useStockRefresh(cartProductIds, {
    pollInterval: 0,
    useVisibilityObserver: true,
  })

  // Stock issues
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

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = getSubtotal()
  const shipping = getShipping()
  const freeShipping = subtotal >= 50

  const handleViewCart = () => {
    closeCart()
    setView({ type: "cart" })
  }

  const handleCheckout = () => {
    closeCart()
    setView({ type: "checkout" })
  }

  const handleStartShopping = () => {
    closeCart()
    setView({ type: "products" })
  }

  const handleContinueShopping = () => {
    closeCart()
    setView({ type: "home" })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeCart() }}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        {/* Header */}
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalItems} {totalItems === 1 ? 'item' : 'items'})
              </span>
            )}
          </SheetTitle>
          {/* Gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 rounded-full mt-2" />
        </SheetHeader>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
                className="text-lg font-semibold"
              >
                Your cart is empty
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
                className="text-sm text-muted-foreground max-w-xs"
              >
                Looks like you haven&apos;t added anything to your cart yet. Start exploring our products!
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
              >
                <Button onClick={handleStartShopping} className="mt-2 bg-orange-500 text-white hover:bg-orange-600">
                  Start Shopping
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex gap-3 border-l-2 border-orange-500 p-4">
                      {/* Product Image */}
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h4 className="truncate text-sm font-medium leading-tight">
                          {item.name}
                        </h4>
                        {/* Stock Warning in Drawer */}
                        {stockIssues.has(item.productId) && (() => {
                          const issue = stockIssues.get(item.productId)!
                          if (issue.outOfStock) {
                            return (
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <PackageX className="h-3 w-3" />
                                <span className="text-xs font-medium">Out of Stock</span>
                              </div>
                            )
                          }
                          if (issue.quantityExceeds) {
                            return (
                              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-xs font-medium">Only {issue.currentStock} left</span>
                              </div>
                            )
                          }
                          return null
                        })()}
                        <p className="text-sm font-semibold text-orange-500">
                          {formatPrice(item.price)}
                        </p>

                        {/* Quantity + Remove */}
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-0 rounded-md border">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="flex h-8 w-10 items-center justify-center border-x text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock || (stockIssues.get(item.productId)?.outOfStock ?? false)}
                              className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Bottom Section */}
            <div className="border-t bg-background p-4 space-y-3">
              {/* Stock Issue Warning */}
              {hasStockIssues && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="flex-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Stock has changed for some items
                  </span>
                  <button
                    onClick={refreshStock}
                    disabled={stockLoading}
                    className="shrink-0 text-amber-600 hover:text-amber-800 disabled:opacity-50"
                    aria-label="Refresh stock"
                  >
                    {stockLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  </button>
                </motion.div>
              )}

              {/* Free shipping progress bar */}
              <FreeShippingProgressBar subtotal={subtotal} />

              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              {/* Shipping */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                {freeShipping ? (
                  <span className="text-sm font-medium text-green-600">Free shipping</span>
                ) : (
                  <span className="font-medium">{formatPrice(shipping)}</span>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleContinueShopping}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Continue Shopping
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleViewCart}
                >
                  View Cart
                </Button>
                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  onClick={handleCheckout}
                >
                  Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
