'use client'

import { useState, useCallback, useEffect } from "react"
import {
  formatPrice,
  parseItems,
  parseAddress,
  type Order,
  type OrderItemData,
  type ShippingAddress,
} from "@/lib/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Package,
  Truck,
  Check,
  Clock,
  ShoppingBag,
  MapPin,
  Search,
  SearchX,
  PackageSearch,
  Mail,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// ── Types ──────────────────────────────────────────────────────────
type OrderStatus = Order["status"]

interface TrackingStep {
  key: OrderStatus | "placed" | "out_for_delivery"
  label: string
  icon: typeof Package
}

const TRACKING_STEPS: TrackingStep[] = [
  { key: "placed", label: "Order Placed", icon: ShoppingBag },
  { key: "processing", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Check },
]

// ── Helpers ────────────────────────────────────────────────────────
function getStepIndex(status: OrderStatus): number {
  if (status === "cancelled") return -1
  switch (status) {
    case "pending": return 0
    case "processing": return 1
    case "shipped": return 2
    case "out_for_delivery": return 3
    case "delivered": return 4
    default: return 0
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  shipped: {
    label: "Shipped",
    color: "bg-blue-100 text-orange-800 dark:bg-orange-900/30 dark:text-blue-400",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
}

// ── Vertical Timeline Component ────────────────────────────────────
function TrackingTimeline({ order }: { order: Order }) {
  const isCancelled = order.status === "cancelled"
  const currentIndex = getStepIndex(order.status as OrderStatus)

  return (
    <div className="space-y-0 py-2">
      {TRACKING_STEPS.map((step, idx) => {
        const StepIcon = step.icon
        const isCompleted = !isCancelled && currentIndex > idx
        const isCurrent = !isCancelled && currentIndex === idx

        let circleClass = "border-muted-foreground/30 bg-background text-muted-foreground"
        let lineClass = "bg-muted-foreground/20"
        let labelClass = "text-muted-foreground"

        if (isCancelled) {
          circleClass = "border-red-400 bg-red-400/10 text-red-500"
          lineClass = "bg-red-400/30"
          labelClass = "text-red-400"
        } else if (isCompleted) {
          circleClass = "border-green-500 bg-green-500 text-white"
          lineClass = "bg-green-500"
          labelClass = "text-green-600 dark:text-green-400"
        } else if (isCurrent) {
          circleClass = "border-blue-600 bg-blue-600 text-white ring-4 ring-blue-600/20"
          labelClass = "text-blue-600 font-semibold"
        }

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
            className="relative flex gap-4"
          >
            {/* Vertical connector line */}
            {idx < TRACKING_STEPS.length - 1 && (
              <div className="absolute left-[19px] top-10 bottom-0 w-0.5">
                <div className={`h-full ${lineClass} transition-colors duration-500`} />
              </div>
            )}
            {/* Circle icon */}
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 sm:h-11 sm:w-11">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500 sm:h-11 sm:w-11 ${circleClass}`}>
                {isCompleted ? (
                  <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : isCancelled && idx === 0 ? (
                  <PackageSearch className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>
            </div>
            {/* Label + date */}
            <div className="flex min-w-0 flex-1 flex-col pb-8">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm transition-colors duration-500 ${labelClass}`}>
                  {step.label}
                </span>
                {isCompleted && (
                  <Badge
                    variant="secondary"
                    className="shrink-0 border-0 bg-green-100 text-green-700 text-[10px] dark:bg-green-900/30 dark:text-green-400"
                  >
                    Completed
                  </Badge>
                )}
                {isCurrent && (
                  <Badge
                    variant="secondary"
                    className="shrink-0 border-0 bg-blue-100 text-orange-700 text-[10px] dark:bg-orange-900/30 dark:text-blue-400"
                  >
                    Current
                  </Badge>
                )}
                {!isCompleted && !isCurrent && (
                  <Badge
                    variant="secondary"
                    className="shrink-0 border-0 bg-muted text-muted-foreground text-[10px]"
                  >
                    Upcoming
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {isCompleted
                  ? formatDate(order.createdAt)
                  : isCurrent
                    ? formatDate(order.updatedAt)
                    : "—"}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Search Skeleton ────────────────────────────────────────────────
function TrackingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`track-event-sk-${i}`} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  )
}

// ── Tracking Content (inner content, no Sheet wrapper) ─────────────
function TrackingContent() {
  const [orderNumber, setOrderNumber] = useState("")
  const [email, setEmail] = useState("")
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTrack = useCallback(async () => {
    if (!orderNumber.trim()) return

    setLoading(true)
    setError(null)
    setSearched(true)
    setOrder(null)

    try {
      const params = new URLSearchParams()
      params.set("limit", "100")
      if (email.trim()) params.set("email", email.trim())

      const res = await fetch(`/api/orders?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Failed to fetch orders")
      }

      const data = await res.json()
      const query = orderNumber.trim().toLowerCase()
      // Case-insensitive substring match
      const found = data.orders?.find(
        (o: Order) => o.orderNumber.toLowerCase().includes(query)
      )

      if (found) {
        setOrder(found)
      } else {
        setError("Order not found")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [orderNumber, email])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTrack()
  }

  const handleReset = () => {
    setOrder(null)
    setSearched(false)
    setError(null)
    setOrderNumber("")
    setEmail("")
  }

  const items = order ? parseItems<OrderItemData>(order.items) : []
  const address = order ? parseAddress(order.shippingAddress) : {} as ShippingAddress
  const statusCfg = order ? STATUS_CONFIG[order.status as OrderStatus] : null

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <AnimatePresence mode="wait">
        {!searched ? (
          <motion.div
            key="search-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label
                htmlFor="tracking-order-number"
                className="text-sm font-medium text-foreground"
              >
                Order Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="tracking-order-number"
                  placeholder="e.g. SS-17000000001234"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tracking-email"
                className="text-sm font-medium text-foreground"
              >
                Email <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="tracking-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              onClick={handleTrack}
              disabled={!orderNumber.trim() || loading}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Search className="mr-2 h-4 w-4 animate-pulse" />
                  Searching...
                </>
              ) : (
                <>
                  <Truck className="mr-2 h-4 w-4" />
                  Track Order
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Enter the order number from your confirmation email
            </p>
          </motion.div>
        ) : loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <TrackingSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 py-8 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
              <SearchX className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Order Not Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We couldn&apos;t find an order with that number.
                Please double-check and try again.
              </p>
            </div>
            <Button variant="outline" onClick={handleReset} className="mt-2">
              Try Again
            </Button>
          </motion.div>
        ) : order ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Order Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{order.orderNumber}</h3>
                <p className="text-xs text-muted-foreground">
                  Placed on {formatDate(order.createdAt)}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={`border-0 text-xs font-medium ${statusCfg?.color}`}
              >
                {statusCfg?.label}
              </Badge>
            </div>

            {/* Progress Timeline */}
            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4 text-blue-600" />
                  Tracking Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrackingTimeline order={order} />
              </CardContent>
            </Card>

            {/* Order Items Summary */}
            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-blue-600" />
                  Order Items ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.2 }}
                    className="flex items-center gap-3"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={item.image || "/images/placeholder.png"}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {item.quantity} &times; {formatPrice(item.price)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </motion.div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">{formatPrice(order.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {address.firstName} {address.lastName}
                  </p>
                  <p>{address.address}</p>
                  {address.apartment && <p>{address.apartment}</p>}
                  <p>
                    {address.city}, {address.state} {address.zipCode}
                  </p>
                  <p>{address.country}</p>
                </div>
              </CardContent>
            </Card>

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full"
            >
              Track Another Order
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// ── Truck icon for the Sheet header ────────────────────────────────
function TruckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="20"
      height="20"
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  )
}

// ── Main Component with Sheet ──────────────────────────────────────
export function OrderTracking() {
  const [open, setOpen] = useState(false)

  // Listen for custom event to open the tracking sheet
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("open-order-tracking", handler)
    return () => window.removeEventListener("open-order-tracking", handler)
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <TruckIcon className="h-5 w-5 text-blue-600" />
            Track Your Order
          </SheetTitle>
          <SheetDescription>
            Enter your order number to check the delivery status
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <TrackingContent />
        </div>
      </SheetContent>
    </Sheet>
  )
}
