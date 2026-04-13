'use client'

import { useState } from "react"
import { motion } from "framer-motion"
import { useUIStore } from "@/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Package, ArrowRight, FileDown, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ── Animation Variants ─────────────────────────────────────────────
const checkmarkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
      delay: 0.2,
    },
  },
}

const circleVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
      delay: 0.1,
    },
  },
}

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.5,
      ease: "easeOut",
    },
  },
}

const buttonsVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.7,
      ease: "easeOut",
    },
  },
}

// ── Main Component ─────────────────────────────────────────────────
export function OrderConfirmation({
  orderNumber,
  orderId,
}: {
  orderNumber: string
  orderId: string
}) {
  const setView = useUIStore((s) => s.setView)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  const handleViewDetails = () => {
    setView({ type: "order-detail", orderId })
  }

  const handleContinueShopping = () => {
    setView({ type: "home" })
  }

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice`)
      if (!res.ok) {
        throw new Error("Failed to generate invoice")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${orderNumber || orderId}.pdf`
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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Success Animation */}
          <div className="relative">
            <motion.div
              variants={circleVariants}
              initial="hidden"
              animate="visible"
              className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900"
            >
              <motion.div
                variants={checkmarkVariants}
                initial="hidden"
                animate="visible"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.polyline
                    points="20 6 9 17 4 12"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>
            </motion.div>

            {/* Subtle pulse ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-4 border-green-500"
            />
          </div>

          {/* Text Content */}
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <h1 className="text-2xl font-bold sm:text-3xl">
              Order Placed Successfully!
            </h1>
            <p className="text-muted-foreground">
              Thank you for your purchase
            </p>
          </motion.div>

          {/* Order Number */}
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            className="rounded-xl border bg-muted/30 px-6 py-4"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Order Number
            </p>
            <p className="mt-1 font-mono text-xl font-bold tracking-wider text-orange-500 sm:text-2xl">
              {orderNumber}
            </p>
          </motion.div>

          {/* Delivery Info */}
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
          >
            <Package className="h-5 w-5 shrink-0 text-orange-500" />
            <span>
              Your order will be delivered in <strong className="text-foreground">3-5 business days</strong>
            </span>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            variants={buttonsVariants}
            initial="hidden"
            animate="visible"
            className="flex w-full flex-col gap-3 sm:flex-row"
          >
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
            >
              {downloadingInvoice ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              {downloadingInvoice ? "Downloading..." : "Download Invoice"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleViewDetails}
            >
              View Order Details
              <Package className="ml-2 h-4 w-4" />
            </Button>
            <Button
              className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
              onClick={handleContinueShopping}
            >
              Continue Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
