'use client'

import { useState, useEffect, useCallback, useRef } from "react"
import { toast as sonnerToast } from "sonner"
import { motion } from "framer-motion"
import { useCartStore } from "@/stores/cart-store"
import { useUIStore } from "@/stores/ui-store"
import { formatPrice, parseItems, parseAddress, type Order, type OrderItemData } from "@/lib/types"
import { useOrderPolling } from "@/hooks/use-order-polling"
import { useRealtimeRefetch } from "@/hooks/use-supabase-realtime"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  Truck,
  CreditCard,
  Check,
  Clock,
  MapPin,
  Package,
  RotateCcw,
  ShoppingBag,
  Smartphone,
  X,
  FileDown,
  Calendar,
  Ban,
  RefreshCw,
  Clock as ClockIcon,
  Bike,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { BkashLogo, NagadLogo, RocketLogo, GPayLogo } from "@/components/payment/payment-logos"

// ── Types ──────────────────────────────────────────────────────────
interface OrderWithItems extends Order {
  orderItems?: Array<{
    id: string
    productId: string
    name: string
    price: number
    quantity: number
    image: string
  }>
}

// ── Progress Tracker Config ────────────────────────────────────────
type OrderStatus = Order["status"]

const PROGRESS_STEPS: { key: OrderStatus | "placed"; label: string; icon: any }[] = [
  { key: "placed", label: "Order Placed", icon: ShoppingBag },
  { key: "processing", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Bike },
  { key: "delivered", label: "Delivered", icon: Check },
]

const STATUS_SEQUENCE: OrderStatus[] = ["pending", "processing", "shipped", "out_for_delivery", "delivered"]

function getStepIndex(status: OrderStatus): number {
  if (status === "cancelled") return -2 // Special value for cancelled
  return STATUS_SEQUENCE.indexOf(status)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

const RETURN_REASONS = [
  "Wrong Size",
  "Wrong Color",
  "Defective",
  "Not as Described",
  "Changed My Mind",
  "Other",
]

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string }
> = {
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

// ── Animated Progress Tracker Component ─────────────────────────────
function ProgressTracker({ status }: { status: OrderStatus }) {
  const isCancelled = status === "cancelled"
  const currentIndex = getStepIndex(status)

  return (
    <div className="py-4">
      {/* Desktop: Horizontal layout */}
      <div className="hidden items-center justify-between gap-2 sm:flex sm:gap-4">
        {PROGRESS_STEPS.map((step, idx) => {
          const StepIcon = step.icon
          const isCompleted = !isCancelled && currentIndex > idx
          const isCurrent = !isCancelled && currentIndex === idx

          let circleClass = "border-muted-foreground/30 bg-background text-muted-foreground"
          let lineClass = "bg-muted-foreground/20"
          let labelClass = "text-muted-foreground"

          if (isCancelled) {
            circleClass = "border-red-500 bg-red-500 text-white"
            lineClass = "bg-red-500"
            labelClass = "text-red-500"
          } else if (isCompleted) {
            circleClass = "border-green-500 bg-green-500 text-white"
            lineClass = "bg-green-500"
            labelClass = "text-green-600 dark:text-green-400"
          } else if (isCurrent) {
            circleClass = "border-blue-600 bg-blue-600 text-white"
            labelClass = "text-blue-600"
          }

          return (
            <div key={step.key} className="flex flex-1 items-center gap-2 sm:gap-4 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 sm:h-12 sm:w-12 ${circleClass}`}
                  initial={isCurrent ? { scale: 0.8 } : { scale: 1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                    >
                      <Check className="h-5 w-5" />
                    </motion.div>
                  ) : isCancelled ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </motion.div>
                <span className={`text-xs font-medium sm:text-sm ${labelClass}`}>
                  {step.label}
                </span>
              </div>
              {idx < PROGRESS_STEPS.length - 1 && (
                <motion.div
                  className={`h-0.5 flex-1 transition-colors ${lineClass}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  style={{ transformOrigin: "left" }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: Vertical layout */}
      <div className="relative flex flex-col gap-0 sm:hidden">
        {PROGRESS_STEPS.map((step, idx) => {
          const StepIcon = step.icon
          const isCompleted = !isCancelled && currentIndex > idx
          const isCurrent = !isCancelled && currentIndex === idx

          let circleClass = "border-muted-foreground/30 bg-background text-muted-foreground"
          let labelClass = "text-muted-foreground"

          if (isCancelled) {
            circleClass = "border-red-500 bg-red-500 text-white"
            labelClass = "text-red-500"
          } else if (isCompleted) {
            circleClass = "border-green-500 bg-green-500 text-white"
            labelClass = "text-green-600 dark:text-green-400"
          } else if (isCurrent) {
            circleClass = "border-blue-600 bg-blue-600 text-white"
            labelClass = "text-blue-600 font-semibold"
          }

          return (
            <div key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
              {/* Connecting line */}
              {idx < PROGRESS_STEPS.length - 1 && (
                <div className="absolute left-[18px] top-10 h-full w-0.5 bg-muted-foreground/20">
                  <motion.div
                    className={`h-full w-full ${isCompleted && !isCancelled ? "bg-green-500" : isCancelled ? "bg-red-500" : ""}`}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    style={{ transformOrigin: "top" }}
                  />
                </div>
              )}

              {/* Icon circle */}
              <motion.div
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${circleClass}`}
                initial={isCurrent ? { scale: 0.8 } : { scale: 1 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                  >
                    <Check className="h-4 w-4" />
                  </motion.div>
                ) : isCancelled ? (
                  <X className="h-4 w-4" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </motion.div>

              {/* Label */}
              <div className="pt-1">
                <span className={`text-sm font-medium ${labelClass}`}>
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Skeleton Loader ────────────────────────────────────────────────
function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      {/* Progress tracker skeleton */}
      <div className="flex justify-between gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`track-sk-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      {/* Items table skeleton */}
      <Skeleton className="h-48 w-full rounded-xl" />
      {/* Summary skeleton */}
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  )
}

// ── Payment Method Display ─────────────────────────────────────────
function PaymentMethodDisplay({ method }: { method: string }) {
  const configs: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; extra?: string }> = {
    credit_card: { icon: CreditCard, label: "Credit Card", extra: "Visa, Mastercard, Amex" },
    paypal: {
      icon: ({ className }: { className?: string }) => (
        <div className={`flex h-5 w-5 items-center justify-center rounded bg-[#003087] ${className ?? ""}`}>
          <span className="text-[9px] font-bold text-white">P</span>
        </div>
      ),
      label: "PayPal",
    },
    apple_pay: {
      icon: ({ className }: { className?: string }) => (
        <div className={`flex h-5 w-5 items-center justify-center rounded-md bg-black ${className ?? ""}`}>
          <span className="text-[9px] font-medium text-white">Pay</span>
        </div>
      ),
      label: "Apple Pay",
    },
    bkash: { icon: ({ className }: { className?: string }) => <BkashLogo className={className} />, label: "bKash", extra: "Paid with bKash" },
    nagad: { icon: ({ className }: { className?: string }) => <NagadLogo className={className} />, label: "Nagad", extra: "Paid with Nagad" },
    rocket: { icon: ({ className }: { className?: string }) => <RocketLogo className={className} />, label: "Rocket", extra: "Paid with Rocket" },
    gpay: { icon: ({ className }: { className?: string }) => <GPayLogo className={className} />, label: "Google Pay", extra: "Paid with Google Pay" },
  }

  const config = configs[method] || configs.credit_card
  const IconComponent = config.icon

  return (
    <div className="flex items-center gap-3">
      <IconComponent className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium capitalize">{config.label}</p>
        {config.extra && (
          <p className="text-xs text-muted-foreground">{config.extra}</p>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────
export function OrderDetail({ orderId }: { orderId: string }) {
  const setView = useUIStore((s) => s.setView)
  const addItem = useCartStore((s) => s.addItem)
  const { toast } = useToast()

  const [reordering, setReordering] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [selectedReturnItems, setSelectedReturnItems] = useState<Set<number>>(new Set())
  const [returnReason, setReturnReason] = useState("")
  const [returnComment, setReturnComment] = useState("")
  const [returning, setReturning] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  // Track previous status for change detection toast
  const prevStatusRef = useRef<string | null>(null)

  // Use the order polling hook for realtime updates
  const {
    order: polledOrder,
    isLoading: loading,
    error,
    lastStatusChangeAt,
    previousStatus,
    lastUpdated,
    refresh,
  } = useOrderPolling(orderId, {
    pollInterval: 30000, // Poll every 30 seconds
    useVisibilityObserver: true,
    enabled: true,
  })

  // Realtime refetch for this specific order via Supabase Realtime
  useRealtimeRefetch({
    table: 'orders',
    filter: `id=eq.${orderId}`,
    enabled: !!orderId,
    refetch: refresh,
    debounceMs: 2000,
  })

  // Detect status changes and show toast
  useEffect(() => {
    if (lastStatusChangeAt && previousStatus && polledOrder) {
      const statusLabel = polledOrder.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      sonnerToast.success(`Order status updated!`, {
        description: `Your order status changed from "${previousStatus.replace(/_/g, ' ')}" to "${polledOrder.status.replace(/_/g, ' ')}"`,
        duration: 5000,
      })
    }
  }, [lastStatusChangeAt, previousStatus, polledOrder])

  // Local state for cancel simulation (overrides polled data)
  const [localCancelOverride, setLocalCancelOverride] = useState(false)

  // Derive the effective order
  const order = polledOrder ? (localCancelOverride ? { ...polledOrder, status: "cancelled" as const } : polledOrder) as OrderWithItems : null

  const handleBack = () => {
    setView({ type: "orders" })
  }

  const handleReorder = async () => {
    if (!order) return
    const items = parseItems<OrderItemData>(order.items)
    setReordering(true)

    try {
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
      setReordering(false)
    }
  }

  const handleReturnRequest = async () => {
    if (!order) return
    if (selectedReturnItems.size === 0) {
      sonnerToast.error("Please select at least one item to return")
      return
    }
    if (!returnReason) {
      sonnerToast.error("Please select a return reason")
      return
    }
    setReturning(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 600))
      setIsReturning(true)
      sonnerToast.success("Return request submitted successfully!")
      setReturnDialogOpen(false)
      setSelectedReturnItems(new Set())
      setReturnReason("")
      setReturnComment("")
    } finally {
      setReturning(false)
    }
  }

  const toggleReturnItem = (index: number) => {
    setSelectedReturnItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleCancelOrder = async () => {
    if (!order) return
    setCancelling(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 600))
      setLocalCancelOverride(true)
      sonnerToast.success("Order cancelled successfully")
      setCancelDialogOpen(false)
      setCancelReason("")
    } finally {
      setCancelling(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!order) return
    setDownloadingInvoice(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/invoice`)
      if (!res.ok) {
        throw new Error("Failed to generate invoice")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${order.orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      sonnerToast.success("Invoice downloaded!")
    } catch {
      sonnerToast.error("Failed to download invoice. Please try again.")
    } finally {
      setDownloadingInvoice(false)
    }
  }

  // Calculate estimated delivery date
  const getEstimatedDelivery = () => {
    if (!order) return ""
    const orderDate = new Date(order.createdAt)
    const minDelivery = new Date(orderDate)
    minDelivery.setDate(minDelivery.getDate() + 3)
    const maxDelivery = new Date(orderDate)
    maxDelivery.setDate(maxDelivery.getDate() + 5)
    return `${formatDateShort(minDelivery.toString())} - ${formatDateShort(maxDelivery.toString())}`
  }

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="mb-6 h-5 w-48" />
          <OrderDetailSkeleton />
        </div>
      </main>
    )
  }

  // ── Error ──────────────────────────────────────────────────────
  if (error || !order) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => { e.preventDefault(); setView({ type: "home" }) }}
                  >
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => { e.preventDefault(); setView({ type: "orders" }) }}
                  >
                    My Orders
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </nav>
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <Package className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Order Not Found</h2>
            <p className="text-sm text-muted-foreground">
              {error || "The order you are looking for does not exist."}
            </p>
            <Button variant="outline" onClick={handleBack} className="mt-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // ── Parsed Data ────────────────────────────────────────────────
  const items = parseItems<OrderItemData>(order.items)
  const address = parseAddress(order.shippingAddress)
  const statusCfg = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.pending
  const isCancelled = order.status === "cancelled"
  const canCancel = order.status === "pending" || order.status === "processing"
  const canReturn = order.status === "delivered" && !isReturning

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => { e.preventDefault(); setView({ type: "home" }) }}
                >
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => { e.preventDefault(); setView({ type: "orders" }) }}
                >
                  My Orders
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Order #{order.orderNumber}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </nav>

        {/* Back Button + Last Updated Indicator */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </button>
          {lastUpdated && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                aria-label="Refresh order"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Order Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className={`border-0 text-sm font-medium ${statusCfg.color}`}
            >
              {statusCfg.label}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
            >
              {downloadingInvoice ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <RefreshCw className="h-4 w-4" />
                </motion.span>
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {downloadingInvoice ? "Downloading..." : "Download Invoice"}
            </Button>
          </div>
        </div>

        {/* Animated Progress Tracker */}
        <Card className="mb-6">
          <CardContent className="px-4 sm:px-6">
            <ProgressTracker status={order.status as OrderStatus} />
          </CardContent>
        </Card>

        {/* Estimated Delivery Section */}
        {!isCancelled && order.status !== "delivered" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-6"
          >
            <Card className="overflow-hidden border-l-4 border-l-blue-600">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-orange-950/30">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Estimated Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      {getEstimatedDelivery()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Shipping Address + Payment Method */}
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          {/* Shipping Address */}
          <Card>
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
                <p className="mt-1">{address.phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-blue-600" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodDisplay method={order.paymentMethod} />
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-blue-600" />
              Order Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs font-medium">
                          ×{item.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatPrice(item.price)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile List */}
            <div className="space-y-0 divide-y md:hidden">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="relative mb-6 overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-400 via-blue-600 to-blue-700" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              {order.shipping === 0 ? (
                <span className="font-medium text-green-600">Free</span>
              ) : (
                <span className="font-medium">{formatPrice(order.shipping)}</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">{formatPrice(order.tax)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-blue-600">{formatPrice(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {!isCancelled && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                toast({
                  title: "Tracking",
                  description: "Order tracking is available once your order has been shipped.",
                })
              }}
            >
              <Truck className="mr-2 h-4 w-4" />
              Track Order
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
          >
            {downloadingInvoice ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                className="mr-2 inline-block"
              >
                <RefreshCw className="h-4 w-4" />
              </motion.span>
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            {downloadingInvoice ? "Downloading..." : "Download Invoice"}
          </Button>
          <Button
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleReorder}
            disabled={reordering}
          >
            {reordering ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="mr-2 inline-block"
                >
                  <RotateCcw className="h-4 w-4" />
                </motion.span>
                Adding...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reorder
              </>
            )}
          </Button>
          {canReturn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Request Return
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Request Return</AlertDialogTitle>
                    <AlertDialogDescription>
                      Select the items you&apos;d like to return and provide a reason.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-2">
                    {/* Item selection */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Select Items to Return</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {items.map((item, idx) => (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                              selectedReturnItems.has(idx)
                                ? "border-blue-600 bg-blue-50 dark:bg-orange-950/30"
                                : "border-border hover:border-blue-300"
                            }`}
                          >
                            <Checkbox
                              checked={selectedReturnItems.has(idx)}
                              onCheckedChange={() => toggleReturnItem(idx)}
                            />
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Qty: {item.quantity} × {formatPrice(item.price)}
                                </p>
                              </div>
                              <span className="text-sm font-semibold shrink-0">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Return reason */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Return Reason</p>
                      <Select value={returnReason} onValueChange={setReturnReason}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {RETURN_REASONS.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Additional comments */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Additional Comments{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </p>
                      <Textarea
                        value={returnComment}
                        onChange={(e) => {
                          if (e.target.value.length <= 200) {
                            setReturnComment(e.target.value)
                          }
                        }}
                        placeholder="Tell us more about your return..."
                        className="resize-none"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {returnComment.length}/200
                      </p>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => {
                        setSelectedReturnItems(new Set())
                        setReturnReason("")
                        setReturnComment("")
                      }}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReturnRequest}
                      disabled={returning || selectedReturnItems.size === 0 || !returnReason}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {returning ? "Submitting..." : "Submit Return Request"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </motion.div>
          )}
          {canCancel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                  >
                    <Ban className="h-4 w-4" />
                    Cancel Order
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this order? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-2">
                    <label className="text-sm font-medium mb-1.5 block">
                      Cancellation Reason
                    </label>
                    <Select value={cancelReason} onValueChange={setCancelReason}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="changed_mind">Changed my mind</SelectItem>
                        <SelectItem value="better_price">Found a better price</SelectItem>
                        <SelectItem value="shipping_slow">Shipping too slow</SelectItem>
                        <SelectItem value="ordered_mistake">Ordered by mistake</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCancelReason("")}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelOrder}
                      disabled={cancelling || !cancelReason}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  )
}
