'use client'

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUIStore } from "@/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Package,
  ArrowRight,
  FileDown,
  Loader2,
  Truck,
  Clock,
  ShieldCheck,
  CreditCard,
  Mail,
  CheckCircle2,
  PartyPopper,
  MapPin,
  ChevronRight,
} from "lucide-react"
import confetti from "canvas-confetti"
import { toast } from "sonner"
import { formatPrice, parseAddress, parseItems, type OrderItemData } from "@/lib/types"

// ── Types ──────────────────────────────────────────────────────
interface OrderData {
  id: string
  orderNumber: string
  status: string
  items: string
  subtotal: number
  shipping: number
  tax: number
  total: number
  shippingAddress: string
  paymentMethod: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  notes: string | null
  orderItems?: OrderItemData[]
  createdAt: string
}

// ── Animation Variants ─────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const scaleVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 260, damping: 20, delay: 0.1 },
  },
}

const checkPathVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.6, delay: 0.5, ease: "easeInOut" },
  },
}

const ringVariants = {
  hidden: { scale: 0.8, opacity: 0.6 },
  visible: {
    scale: 1.8,
    opacity: 0,
    transition: { duration: 1.5, delay: 0.6, ease: "easeOut" },
  },
}

const ring2Variants = {
  hidden: { scale: 0.8, opacity: 0.4 },
  visible: {
    scale: 2.2,
    opacity: 0,
    transition: { duration: 2, delay: 0.9, ease: "easeOut" },
  },
}

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: 1.2 + i * 0.15, ease: "easeOut" },
  }),
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: 0.8 + i * 0.08, ease: "easeOut" },
  }),
}

// ── Confetti celebration ───────────────────────────────────────
function fireCelebration() {
  const duration = 3000
  const end = Date.now() + duration

  const colors = ["#f97316", "#fb923c", "#22c55e", "#fbbf24", "#a855f7", "#06b6d4"]

  // Center burst
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.5 },
    colors,
  })

  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    })
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    })
  }, 200)

  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 120,
      origin: { y: 0.4 },
      colors,
    })
  }, 600)

  // Subtle ongoing celebration
  const interval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval)
      return
    }
    confetti({
      particleCount: 3,
      angle: 60 + Math.random() * 60,
      spread: 30 + Math.random() * 30,
      origin: { x: Math.random(), y: 0.3 + Math.random() * 0.4 },
      colors,
      startVelocity: 15 + Math.random() * 20,
    })
  }, 200)
}

// ── Estimated Delivery ─────────────────────────────────────────
function getEstimatedDelivery() {
  const today = new Date()
  let businessDays = 0
  let currentDate = new Date(today)
  while (businessDays < 3) {
    currentDate.setDate(currentDate.getDate() + 1)
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) businessDays++
  }
  const minDate = new Date(currentDate)
  businessDays = 0
  currentDate = new Date(today)
  while (businessDays < 5) {
    currentDate.setDate(currentDate.getDate() + 1)
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) businessDays++
  }
  const maxDate = currentDate
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return { min: fmt(minDate), max: fmt(maxDate), minShort: minDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }), maxShort: maxDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) }
}

// ── Main Component ─────────────────────────────────────────────
export function OrderConfirmation({
  orderNumber: initialOrderNumber,
  orderId,
}: {
  orderNumber: string
  orderId: string
}) {
  const setView = useUIStore((s) => s.setView)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderItems, setOrderItems] = useState<OrderItemData[]>([])
  const confettiFired = useRef(false)

  // Fetch order details
  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
          // Parse items from JSON string
          if (data.items) {
            try {
              const parsed = JSON.parse(data.items)
              setOrderItems(parsed)
            } catch {
              setOrderItems([])
            }
          }
          // Also use orderItems if available (enriched from API)
          if (data.orderItems && Array.isArray(data.orderItems)) {
            setOrderItems(data.orderItems.map((item: Record<string, unknown>) => ({
              productId: (item.productId || item.product_id || '') as string,
              name: (item.name || '') as string,
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
              image: (item.image || '') as string,
            })))
          }
        }
      } catch (err) {
        console.error("Failed to fetch order:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderId])

  // Fire confetti once
  useEffect(() => {
    if (!confettiFired.current) {
      confettiFired.current = true
      setTimeout(fireCelebration, 400)
    }
  }, [])

  const delivery = getEstimatedDelivery()

  const handleViewOrders = () => {
    setView({ type: "orders" })
  }

  const handleContinueShopping = () => {
    setView({ type: "home" })
  }

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice`)
      if (!res.ok) throw new Error("Failed to generate invoice")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${initialOrderNumber || orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Invoice downloaded!")
    } catch {
      toast.error("Failed to download invoice. Please try again.")
    } finally {
      setDownloadingInvoice(false)
    }
  }

  const displayOrderNumber = order?.orderNumber || initialOrderNumber

  // ── Loading State ────────────────────────────────────────────
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="h-6 w-6 text-orange-500" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Processing your order...</p>
        </div>
      </main>
    )
  }

  // ── Error State ──────────────────────────────────────────────
  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Order Not Found</h2>
          <p className="text-sm text-muted-foreground">We couldn't find this order. It may have been removed.</p>
          <Button onClick={handleViewOrders} className="mt-2 bg-orange-500 text-white hover:bg-orange-600">
            View My Orders
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    )
  }

  const address = parseAddress(order.shippingAddress)

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50/50 via-background to-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* ── Success Animation ──────────────────────────────── */}
          <motion.div variants={scaleVariants} className="relative mb-6">
            {/* Outer rings */}
            <motion.div
              variants={ringVariants}
              initial="hidden"
              animate="visible"
              className="absolute inset-[-8px] rounded-full border-[3px] border-green-400"
            />
            <motion.div
              variants={ring2Variants}
              initial="hidden"
              animate="visible"
              className="absolute inset-[-16px] rounded-full border-2 border-green-300"
            />

            {/* Main circle */}
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-xl shadow-green-500/25">
              {/* Inner glow */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-300 to-green-500 opacity-50" />

              {/* Checkmark SVG */}
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="relative z-10">
                <motion.circle
                  cx="12" cy="12" r="10"
                  stroke="white"
                  strokeWidth="2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                />
                <motion.polyline
                  points="7 13 10 16 17 9"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  variants={checkPathVariants}
                  initial="hidden"
                  animate="visible"
                />
              </svg>
            </div>
          </motion.div>

          {/* ── Title & Message ─────────────────────────────────── */}
          <motion.div variants={fadeUpVariants} className="mb-6 text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Payment Confirmed
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Order Placed Successfully!
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Thank you for your purchase, {order.customerName?.split(' ')[0] || 'Customer'}! 🎉
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ve received your order and will start processing it right away.
            </p>
          </motion.div>

          {/* ── Order Number Badge ──────────────────────────────── */}
          <motion.div variants={fadeUpVariants} className="mb-6 w-full max-w-sm">
            <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-5 text-center dark:from-orange-950/30 dark:to-amber-950/30 dark:border-orange-800/40">
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-200/30 dark:bg-orange-800/20" />
              <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-amber-200/20 dark:bg-amber-800/10" />
              <p className="relative text-xs font-semibold uppercase tracking-widest text-orange-600/80 dark:text-orange-400/80">
                Order Number
              </p>
              <p className="relative mt-1 font-mono text-2xl font-bold tracking-wider text-orange-600 sm:text-3xl">
                {displayOrderNumber}
              </p>
            </div>
          </motion.div>

          {/* ── Delivery Estimate Card ─────────────────────────── */}
          <motion.div variants={fadeUpVariants} className="mb-6 w-full">
            <Card className="overflow-hidden border-green-200 bg-gradient-to-r from-green-50/80 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/10 dark:border-green-800/40">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40">
                    <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                      Estimated Delivery
                    </p>
                    <p className="mt-0.5 text-lg font-bold text-green-700 dark:text-green-200">
                      {delivery.minShort} — {delivery.maxShort}
                    </p>
                    <p className="mt-0.5 text-xs text-green-600/70 dark:text-green-400/60">
                      Your order will arrive within 3-5 business days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Order Items ─────────────────────────────────────── */}
          {orderItems.length > 0 && (
            <motion.div variants={fadeUpVariants} className="mb-6 w-full">
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-orange-500" />
                    Order Items ({orderItems.length})
                  </h3>
                  <div className="space-y-3">
                    {orderItems.map((item, i) => (
                      <motion.div
                        key={item.productId || i}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center gap-3 rounded-lg bg-muted/30 p-2"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Order Summary ───────────────────────────────────── */}
          <motion.div variants={fadeUpVariants} className="mb-6 w-full">
            <Card>
              <CardContent className="p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <CreditCard className="h-4 w-4 text-orange-500" />
                  Order Summary
                </h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className={order.shipping === 0 ? "font-medium text-green-600" : ""}>
                      {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold text-orange-600">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Shipping & Payment Info ─────────────────────────── */}
          <motion.div variants={fadeUpVariants} className="mb-6 w-full">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Ship To
                  </h4>
                  <div className="text-sm leading-relaxed">
                    <p className="font-medium">{address.firstName} {address.lastName}</p>
                    <p className="text-muted-foreground">{address.address}</p>
                    {address.apartment && <p className="text-muted-foreground">{address.apartment}</p>}
                    <p className="text-muted-foreground">{address.city}, {address.state} {address.zipCode}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Payment
                  </h4>
                  <div className="text-sm">
                    <p className="font-medium capitalize">
                      {order.paymentMethod?.replace(/_/g, ' ') || 'Mobile Payment'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Payment confirmation will be sent to your email
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* ── What&apos;s Next Steps ────────────────────────────── */}
          <motion.div variants={fadeUpVariants} className="mb-6 w-full">
            <Card className="border-dashed">
              <CardContent className="p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <PartyPopper className="h-4 w-4 text-orange-500" />
                  What&apos;s Next?
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      icon: Mail,
                      title: "Confirmation Email",
                      desc: "A confirmation email has been sent to your email address with all order details.",
                    },
                    {
                      icon: Clock,
                      title: "Processing",
                      desc: "We're preparing your order. You'll get updates as it progresses through each stage.",
                    },
                    {
                      icon: Truck,
                      title: "Shipping",
                      desc: `Expect delivery between ${delivery.minShort} and ${delivery.maxShort}. We'll notify you with tracking info.`,
                    },
                  ].map((step, i) => (
                    <motion.div
                      key={step.title}
                      custom={i}
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex items-start gap-3"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <step.icon className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Action Buttons ──────────────────────────────────── */}
          <motion.div
            variants={fadeUpVariants}
            className="flex w-full flex-col gap-3 sm:flex-row"
          >
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
            >
              {downloadingInvoice ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Invoice
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleViewOrders}
            >
              My Orders
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
              onClick={handleContinueShopping}
            >
              Continue Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>

          {/* ── Support Note ────────────────────────────────────── */}
          <motion.div
            variants={fadeUpVariants}
            className="mt-8 text-center text-xs text-muted-foreground"
          >
            <p>Need help? Contact our support team anytime.</p>
            <p className="mt-1">Order ID: {orderId.slice(0, 12)}...</p>
          </motion.div>
        </motion.div>
      </div>
    </main>
  )
}
s
