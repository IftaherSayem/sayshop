'use client'

import { useState, useEffect } from "react"
import { useWishlistStore } from "@/stores/wishlist-store"
import { useCartStore } from "@/stores/cart-store"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Heart,
  ShoppingCart,
  Trash2,
  ChevronRight,
  Star,
  AlertTriangle,
  Share2,
} from "lucide-react"
import { formatPrice, parseImages } from "@/lib/types"
import type { Product, ProductImage } from "@/lib/types"
import { toast } from "sonner"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

export function WishlistPage() {
  const items = useWishlistStore((s) => s.items)
  const removeItem = useWishlistStore((s) => s.removeItem)
  const clearWishlist = useWishlistStore((s) => s.clearWishlist)
  const cartAddItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
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

  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleMoveAllToCart = () => {
    if (items.length === 0) return

    let addedCount = 0
    items.forEach((item) => {
      const existingCartItem = cartItems.find(
        (c) => c.productId === item.productId
      )
      const quantity = existingCartItem ? existingCartItem.quantity : 1
      const stock = existingCartItem?.stock ?? 99

      cartAddItem({
        productId: item.productId,
        name: item.name,
        price: item.price,
        comparePrice: item.comparePrice,
        quantity: 1,
        image: item.image,
        stock,
      })
      addedCount++
    })

    toast.success(`${addedCount} item${addedCount > 1 ? "s" : ""} moved to cart`)
    clearWishlist()
  }

  const handleClearAll = () => {
    clearWishlist()
    setShowClearConfirm(false)
    toast.success("Wishlist cleared")
  }

  const handleRemoveItem = (productId: string, name: string) => {
    removeItem(productId)
    toast.success(`${name} removed from wishlist`)
  }

  const handleNavigateToProduct = (productId: string) => {
    setView({ type: "product-detail", productId })
  }

  const handleShareWishlist = async () => {
    const itemLines = items
      .map((item) => {
        const price = item.comparePrice
          ? `~~${formatPrice(item.comparePrice)}~~ ${formatPrice(item.price)}`
          : formatPrice(item.price)
        return `• ${item.name} — ${price}`
      })
      .join("\n")

    const shareText =
      `Check out my Say Shop wishlist! 🛒\n\n${itemLines}\n\nShop now at sayshop.app`

    try {
      await navigator.clipboard.writeText(shareText)
      toast.success("Wishlist link copied to clipboard!")
    } catch {
      toast.error("Failed to copy to clipboard. Please try again.")
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <button
          onClick={() => setView({ type: "home" })}
          className="transition-colors hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
        >
          Home
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">My Wishlist</span>
      </nav>

      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-bold sm:text-3xl">My Wishlist</h1>
          <Badge variant="secondary" className="ml-1 text-xs font-medium">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="text-muted-foreground hover:text-red-600 hover:border-red-200 dark:hover:border-red-800"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWishlist}
              className="text-orange-600 border-orange-300 hover:bg-orange-500 hover:text-white hover:border-orange-500 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-500 dark:hover:text-white"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share Wishlist
            </Button>
            <Button
              size="sm"
              onClick={handleMoveAllToCart}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
              Move All to Cart
            </Button>
          </div>
        )}
      </div>

      {/* Clear All Confirmation */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
              <p className="flex-1 text-sm text-red-700 dark:text-red-300">
                Are you sure you want to clear your entire wishlist? This action
                cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearConfirm(false)}
                  className="h-8"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {items.length === 0 && !showClearConfirm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <Heart className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Your wishlist is empty</h2>
          <p className="mb-6 max-w-sm text-muted-foreground">
            Save items you love for later. Browse our products and tap the heart
            icon to add them to your wishlist.
          </p>
          <Button
            onClick={() => setView({ type: "products" })}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Browse Products
          </Button>
        </motion.div>
      )}

      {/* Wishlist Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const discount =
                item.comparePrice && item.comparePrice > item.price
                  ? Math.round(
                      ((item.comparePrice - item.price) / item.comparePrice) *
                        100
                    )
                  : 0

              return (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="group overflow-hidden border border-border/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <div
                      className="relative aspect-square cursor-pointer overflow-hidden bg-muted"
                      onClick={() => handleNavigateToProduct(item.productId)}
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      {discount > 0 && (
                        <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600 -rotate-1">
                          -{discount}%
                        </Badge>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveItem(item.productId, item.name)
                        }}
                        className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-muted-foreground opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:bg-neutral-800/90 dark:hover:bg-red-950 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Add to Cart overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 transition-all duration-300 translate-y-4 group-hover:translate-y-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            cartAddItem({
                              productId: item.productId,
                              name: item.name,
                              price: item.price,
                              comparePrice: item.comparePrice,
                              quantity: 1,
                              image: item.image,
                              stock: 10,
                            })
                            toast.success(`${item.name} added to cart`)
                            removeItem(item.productId)
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                    <CardContent
                      className="cursor-pointer p-3"
                      onClick={() => handleNavigateToProduct(item.productId)}
                    >
                      <h3 className="mb-2 text-sm font-medium line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">
                          {formatPrice(item.price)}
                        </span>
                        {item.comparePrice && item.comparePrice > item.price && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(item.comparePrice)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
