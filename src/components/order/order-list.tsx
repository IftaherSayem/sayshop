'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion } from "framer-motion"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { formatPrice, parseItems, type Order, type OrderItemData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Package,
  ShoppingBag,
  Clock,
  ChevronRight,
  Search,
  RotateCcw,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRealtimeRefetch } from "@/hooks/use-supabase-realtime"

// ── Status Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  Order["status"],
  { label: string; color: string; dotColor: string; borderColor: string }
> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    dotColor: "bg-yellow-500",
    borderColor: "border-l-yellow-500",
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    dotColor: "bg-blue-500",
    borderColor: "border-l-blue-500",
  },
  shipped: {
    label: "Shipped",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    dotColor: "bg-orange-500",
    borderColor: "border-l-orange-500",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    dotColor: "bg-blue-500",
    borderColor: "border-l-blue-500",
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    dotColor: "bg-green-500",
    borderColor: "border-l-green-500",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    dotColor: "bg-red-500",
    borderColor: "border-l-red-500",
  },
}

type StatusFilter = "all" | "processing" | "shipped" | "delivered"

const TAB_CONFIG: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// ── Skeleton Loader ────────────────────────────────────────────────
function OrderListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={`order-sk-${i}`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────
export function OrderList() {
  const setView = useUIStore((s) => s.setView)
  const { isAuthenticated } = useAuthStore()

  const { toast } = useToast()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setView({ type: 'auth' })
    }
  }, [isAuthenticated, setView])

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const isVisibleRef = useRef(true)
  const mountedRef = useRef(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/orders?limit=50")
      if (!res.ok) throw new Error("Failed to fetch orders")
      const data = await res.json()
      if (!mountedRef.current) return
      setOrders(data.orders || [])
      setLastUpdated(new Date())
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // Realtime refetch for orders
  useRealtimeRefetch({
    table: 'orders',
    enabled: isAuthenticated,
    refetch: fetchOrders,
    debounceMs: 2000,
  })

  useEffect(() => {
    mountedRef.current = true
    fetchOrders()
    return () => { mountedRef.current = false }
  }, [fetchOrders])

  // Auto-refresh orders every 30 seconds when visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (isVisibleRef.current && mountedRef.current) {
        fetchOrders()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  // Visibility change detection for refresh
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden
      // Refresh when tab becomes visible again
      if (!document.hidden && mountedRef.current) {
        fetchOrders()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchOrders])

  // Focus detection for refresh
  useEffect(() => {
    const handleFocus = () => {
      if (mountedRef.current) fetchOrders()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchOrders])

  const filteredOrders = useMemo(() => {
    let result = orders

    // Filter by status tab
    if (activeTab !== "all") {
      result = result.filter((order) => order.status === activeTab)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter((order) =>
        order.orderNumber.toLowerCase().includes(query)
      )
    }

    return result
  }, [orders, activeTab, searchQuery])

  const handleViewDetails = (orderId: string) => {
    setView({ type: "order-detail", orderId })
  }

  const handleStartShopping = () => {
    setView({ type: "products" })
  }

  const handleReorder = async (order: Order) => {
    const items = parseItems<OrderItemData>(order.items)
    setReorderingId(order.id)

    try {
      // Import cart store dynamically to avoid circular issues
      const { useCartStore } = await import("@/stores/cart-store")
      const addItem = useCartStore.getState().addItem

      for (const item of items) {
        addItem({
          productId: item.productId,
          name: item.name,
          price: item.price,
          comparePrice: null,
          quantity: item.quantity,
          image: item.image,
          stock: 10,
        })
      }

      toast({
        title: "Items added to cart",
        description: `${items.length} item${items.length > 1 ? 's' : ''} from order ${order.orderNumber} added to your cart.`,
      })
    } finally {
      setReorderingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header Gradient Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Package className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">My Orders</h1>
                <p className="mt-0.5 text-sm text-orange-100">
                  Track and manage your orders
                </p>
              </div>
            </div>
            {!loading && orders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-white/80 hover:text-white hover:bg-white/10"
                onClick={fetchOrders}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
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
                <BreadcrumbPage>My Orders</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </nav>

        {/* Search Bar */}
        {!loading && !error && orders.length > 0 && (
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-32"
            />
            {lastUpdated && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {/* Tab Filters */}
        {!loading && !error && orders.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={fetchOrders}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && <OrderListSkeleton />}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-muted">
              <Package className="h-14 w-14 text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl font-semibold">No orders yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              You haven&apos;t placed any orders yet. Start shopping and your order history will appear here.
            </p>
            <Button
              onClick={handleStartShopping}
              className="mt-2 bg-orange-500 text-white hover:bg-orange-600"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Start Shopping
            </Button>
          </div>
        )}

        {/* No Results for Filter/Search */}
        {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50" />
            <h2 className="text-lg font-semibold">No matching orders</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => { setActiveTab("all"); setSearchQuery("") }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Order Cards */}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const items = parseItems<OrderItemData>(order.items)
              const statusCfg = STATUS_CONFIG[order.status as Order["status"]] || STATUS_CONFIG.pending
              const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className={`overflow-hidden border-l-4 transition-shadow hover:shadow-md ${statusCfg.borderColor}`}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Left: Order Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm sm:text-base">
                              {order.orderNumber}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`gap-1.5 border-0 text-xs font-medium ${statusCfg.color}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotColor}`}
                              />
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(order.createdAt)}
                            </span>
                            <span>{totalQty} {totalQty === 1 ? 'item' : 'items'}</span>
                          </div>
                        </div>

                        {/* Right: Total + Actions */}
                        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                          <span className="text-lg font-bold">
                            {formatPrice(order.total)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-500 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/30"
                              onClick={() => handleViewDetails(order.id)}
                            >
                              View Details
                              <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => handleReorder(order)}
                              disabled={reorderingId === order.id}
                            >
                              <motion.span
                                animate={reorderingId === order.id ? { rotate: 360 } : {}}
                                transition={{ duration: 0.5, repeat: reorderingId === order.id ? Infinity : 0, ease: "linear" }}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </motion.span>
                              <span className="hidden sm:inline">Reorder</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
