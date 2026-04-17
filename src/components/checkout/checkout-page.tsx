'use client'

import { useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { useCartStore } from "@/stores/cart-store"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { formatPrice, type ShippingAddress } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  ArrowRight,
  Check,
  Wallet,
  Truck,
  Package,
  Loader2,
  ShoppingBag,
  Tag,
  ShieldCheck,
  Gift,
  Calendar,
  BadgeCheck,
  Shield,
  Smartphone,
  Banknote,
  Lock,
  Plus,
  Star,
} from "lucide-react"
import { toast } from "sonner"
import { BkashLogo, NagadLogo, RocketLogo, GPayLogo } from "@/components/payment/payment-logos"
import { REWARDS_CONFIG, calculatePointsEarned, pointsToValue } from "@/lib/rewards"

// ── Zod Schemas ────────────────────────────────────────────────────
const shippingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  address: z.string().min(1, "Street address is required"),
  apartment: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().min(1, "Phone number is required"),
})

type ShippingFormData = z.infer<typeof shippingSchema>

type PaymentMethod = "bkash" | "nagad" | "rocket" | "gpay"
type CheckoutStep = 1 | 2 | 3

const COUNTRIES = [
  { value: "BD", label: "Bangladesh" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "AU", label: "Australia" },
  { value: "JP", label: "Japan" },
]

const STEPS = [
  { id: 1, label: "Shipping", icon: Truck },
  { id: 2, label: "Payment", icon: Wallet },
  { id: 3, label: "Review", icon: Package },
]

export function CheckoutPage() {
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getShipping = useCartStore((s) => s.getShipping)
  const setView = useUIStore((s) => s.setView)
  const { isAuthenticated, user } = useAuthStore()

  // Wait for Zustand persist to hydrate before checking auth
  const hydrated = useAuthStore((s) => s._hydrated)

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      setView({ type: 'auth' })
    }
  }, [hydrated, isAuthenticated, setView])

  // ── Financial Calculations ─────────────────────────────────
  const subtotal = getSubtotal()
  const shipping = getShipping()
  const tax = subtotal * 0.08

  // ── Coupon State ──────────────────────────────────────────────
  interface CouponData {
    valid: boolean
    code: string
    discountAmount: number
    discountType: 'fixed' | 'percent'
    discountValue: number
    minOrder?: number
    message?: string
  }
  const [couponCode, setCouponCode] = useState("")
  const [couponData, setCouponData] = useState<CouponData | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")
  const couponDiscount = couponData?.discountAmount || 0

  const [step, setStep] = useState<CheckoutStep>(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bkash")
  const [placingOrder, setPlacingOrder] = useState(false)
  const [giftWrap, setGiftWrap] = useState(false)
  const [giftMessage, setGiftMessage] = useState("")
  const GIFT_MESSAGE_MAX = 200
  const [orderNotes, setOrderNotes] = useState("")
  const [saveAddress, setSaveAddress] = useState(false)
  const [paymentPhone, setPaymentPhone] = useState("")
  const [prevStep, setPrevStep] = useState<CheckoutStep>(1)

  // ── Rewards State ─────────────────────────────────────────────
  const [redeemRewards, setRedeemRewards] = useState(false)
  const [availablePoints, setAvailablePoints] = useState(0)

  // ── Address State (Saved Profiles) ──────────────────────────
  interface ProfileAddress {
    id: string
    label: string
    fullName: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
    phone: string
    isDefault: boolean
  }
  const [savedAddresses, setSavedAddresses] = useState<ProfileAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new")
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Fetch Saved Addresses
  useEffect(() => {
    if (!isAuthenticated) return
    const fetchProfile = async () => {
      setLoadingProfile(true)
      try {
        const res = await fetch("/api/user/profile")
        if (res.ok) {
          const data = await res.json()
          const profile = data.user
          setAvailablePoints(profile.points || 0)
          const addrs = profile.address?.addresses || []
          setSavedAddresses(addrs)
          
          // Auto-select default address if it exists
          const defaultAddr = addrs.find((a: ProfileAddress) => a.isDefault)
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id)
            syncFormWithAddress(defaultAddr)
          } else if (addrs.length > 0) {
            setSelectedAddressId(addrs[0].id)
            syncFormWithAddress(addrs[0])
          }
        }
      } catch (err) {
        console.error("Failed to fetch saved addresses:", err)
      } finally {
        setLoadingProfile(false)
      }
    }
    fetchProfile()
  }, [isAuthenticated])

  const syncFormWithAddress = (addr: ProfileAddress) => {
    const names = addr.fullName.split(" ")
    shippingForm.reset({
      firstName: names[0] || "",
      lastName: names.slice(1).join(" ") || "",
      email: user?.email || "", // Use user email
      address: addr.address,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country === "United States" || addr.country === "USA" ? "US" : "BD",
      phone: addr.phone,
    })
  }

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError("")
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: couponCode.trim(),
          subtotal: subtotal,
          items: items 
        }),
      })
      const data = await res.json()
      if (data.valid) {
        // Match the API field names: discountAmount and minOrder
        if (data.minOrder && subtotal < data.minOrder) {
          setCouponError(`Minimum order of ${formatPrice(data.minOrder)} required.`)
          setCouponData(null)
        } else {
          setCouponData(data)
          toast.success("Coupon applied!")
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
  }, [couponCode, subtotal, toast, items])

  const handleRemoveCoupon = () => {
    setCouponData(null)
    setCouponCode("")
    setCouponError("")
  }

  // ── Savings from compare prices ───────────────────────────────
  const savingsFromPrices = items.reduce((acc, item) => {
    if (item.comparePrice && item.comparePrice > item.price) {
      return acc + (item.comparePrice - item.price) * item.quantity
    }
    return acc
  }, 0)

  // ── Estimated Delivery Date ───────────────────────────────────
  const getEstimatedDelivery = () => {
    const today = new Date()
    let businessDays = 0
    let currentDate = new Date(today)
    while (businessDays < 3) {
      currentDate.setDate(currentDate.getDate() + 1)
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++
      }
    }
    const minDate = new Date(currentDate)
    businessDays = 0
    currentDate = new Date(today)
    while (businessDays < 5) {
      currentDate.setDate(currentDate.getDate() + 1)
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++
      }
    }
    const maxDate = currentDate
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return { min: fmt(minDate), max: fmt(maxDate) }
  }
  const deliveryEstimate = getEstimatedDelivery()

  // Confetti is now handled by the OrderConfirmation page

  const giftWrapCost = giftWrap ? 4.99 : 0
  const baseTotal = subtotal + shipping + tax + giftWrapCost

  // ── Rewards Calculation ──────────────────────────────────────
  const potentialPoints = calculatePointsEarned(subtotal)
  const redeemedAmount = redeemRewards ? pointsToValue(availablePoints) : 0
  const totalWithCoupon = Math.max(0, baseTotal - couponDiscount - redeemedAmount)

  // ── Shipping Form ──────────────────────────────────────────────
  const shippingForm = useForm<ShippingFormData>({
    resolver: async (data) => {
      try {
        const result = shippingSchema.safeParse(data)
        if (result.success) {
          return { values: result.data, errors: {} }
        }
        const fieldErrors: Record<string, { message: string }> = {}
        for (const issue of result.error.issues) {
          const key = String(issue.path[0])
          if (!fieldErrors[key]) {
            fieldErrors[key] = { message: issue.message }
          }
        }
        return { values: {}, errors: fieldErrors }
      } catch {
        return { values: {}, errors: {} }
      }
    },
    defaultValues: {
      firstName: "",
      lastName: "",
      email: user?.email || "",
      address: "",
      apartment: "",
      city: "",
      state: "",
      zipCode: "",
      country: "BD",
      phone: "",
    },
  })

  // ── Derived data (use watch to subscribe to form changes) ─────
  const watchedValues = shippingForm.watch()
  const shippingAddress: ShippingAddress = {
    firstName: watchedValues.firstName || "",
    lastName: watchedValues.lastName || "",
    email: watchedValues.email || "",
    address: watchedValues.address || "",
    apartment: watchedValues.apartment || "",
    city: watchedValues.city || "",
    state: watchedValues.state || "",
    zipCode: watchedValues.zipCode || "",
    country: watchedValues.country || "",
    phone: watchedValues.phone || "",
  }

  const handleContinueShipping = useCallback(() => {
    // If using a saved address, we only need to validate it's selected. 
    // The syncFormWithAddress call already ensures the form is populated.
    if (selectedAddressId !== "new") {
      setPrevStep(step)
      setStep(2)
      return
    }

    const result = shippingSchema.safeParse(shippingForm.getValues())
    if (!result.success) {
      // Trigger validation errors
      const fields = Object.keys(shippingForm.getValues())
      fields.forEach((field) => shippingForm.trigger(field as keyof ShippingFormData))
      
      // Specifically inform about which field is failing if it's not obvious
      const firstError = Object.keys(shippingForm.formState.errors)[0]
      if (firstError) {
        toast.error(`Please fix the ${firstError} field to continue.`)
      } else {
        toast.error("Please fill in all required fields.")
      }
      return
    }
    setPrevStep(step)
    setStep(2)
  }, [shippingForm, step, selectedAddressId, toast])

  const handleContinuePayment = useCallback(() => {
    if (paymentMethod === "bkash" || paymentMethod === "nagad" || paymentMethod === "rocket") {
      if (!paymentPhone.trim()) {
        toast.error(`Please enter your ${paymentMethod === "bkash" ? "bKash" : paymentMethod === "nagad" ? "Nagad" : "Rocket"} phone number to continue.`)
        return
      }
    }
    setPrevStep(step)
    setStep(3)
  }, [step, paymentMethod, paymentPhone, toast])

  const handlePlaceOrder = useCallback(async () => {
    // Filter out virtual/combo items that don't exist in the database
    const validItems = items.filter((item) => !item.productId.startsWith("combo-"))
    if (validItems.length === 0) {
      toast.error("Your cart contains only promotional items. Please add real products.")
      return
    }

    setPlacingOrder(true)
    try {
      const orderItems = validItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      }))

      const finalTotal = totalWithCoupon
      const payload = {
        items: orderItems,
        subtotal,
        shipping,
        tax,
        total: finalTotal,
        couponDiscount,
        couponCode: couponData?.code || "",
        giftWrapCost,
        redeemedPoints: redeemRewards ? availablePoints : 0,
        earnedPoints: potentialPoints,
        shippingAddress,
        paymentMethod,
        paymentPhone: paymentPhone || "",
        customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        customerEmail: shippingAddress.email,
        customerPhone: shippingAddress.phone,
        notes: [
          orderNotes.trim(),
          giftWrap ? `Gift Wrapping ($4.99)${giftMessage.trim() ? ` - Message: "${giftMessage.trim()}"` : ""}` : "",
        ].filter(Boolean).join(" | "),
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to place order")
      }

      const order = await res.json()
      clearCart()
      // Navigate to the professional order confirmation page
      setView({ type: 'order-confirmation', orderNumber: order.orderNumber, orderId: order.id })
    } catch (err) {
      console.error("[CheckoutPage] handlePlaceOrder failed:", err)
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setPlacingOrder(false)
    }
  }, [items, subtotal, shipping, tax, baseTotal, couponDiscount, totalWithCoupon, giftWrapCost, shippingAddress, paymentMethod, paymentPhone, clearCart, toast, orderNotes, giftWrap, giftMessage, couponData])

  const handleContinueShopping = () => {
    setView({ type: "products" })
  }

  // ── Hydrating / Empty Cart ────────────────────────────────────
  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
                    onClick={(e) => { e.preventDefault(); setView({ type: "cart" }) }}
                  >
                    Cart
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Checkout</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </nav>
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Your cart is empty</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Add some items to your cart before checking out.
            </p>
            <Button onClick={handleContinueShopping} className="mt-2 bg-blue-600 text-white hover:bg-blue-700">
              Browse Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Order confirmation is now handled by the OrderConfirmation page
  // After placing order, we navigate to { type: 'order-confirmation' } via setView

  // ── Enhanced Progress Indicator ────────────────────────────────
  const renderProgress = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((s, idx) => {
          const isCompleted = step > s.id
          const isCurrent = step === s.id
          return (
            <div key={s.id} className="flex items-center">
              {/* Circle */}
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-colors ${
                    isCompleted || isCurrent
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-muted-foreground/25 bg-background text-muted-foreground"
                  }`}
                  animate={
                    isCurrent
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(249, 115, 22, 0.4)",
                            "0 0 0 8px rgba(249, 115, 22, 0)",
                            "0 0 0 0 rgba(249, 115, 22, 0)",
                          ],
                        }
                      : {}
                  }
                  transition={
                    isCurrent
                      ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      : {}
                  }
                  layout
                >
                  {(isCompleted || isCurrent) ? (
                    <motion.div
                      key={`check-${s.id}`}
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <Check className="h-5 w-5 stroke-[3]" />
                    </motion.div>
                  ) : (
                    <span className="text-sm font-semibold">{s.id}</span>
                  )}
                </motion.div>
                <span
                  className={`text-xs font-medium transition-colors sm:text-sm ${
                    isCurrent
                      ? "font-bold text-blue-700"
                      : isCompleted
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {/* Connecting Line */}
              {idx < STEPS.length - 1 && (
                <div className="relative mx-1 mb-6 h-[3px] w-8 sm:mx-4 sm:w-20 lg:w-28">
                  {/* Background line (gray) */}
                  <div className="absolute inset-0 rounded-full bg-muted-foreground/15" />
                  {/* Progress fill line (orange gradient) */}
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                    initial={false}
                    animate={{
                      width: step > s.id ? "100%" : "0%",
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Step 1: Shipping ───────────────────────────────────────────
  const renderShippingStep = () => (
    <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 overflow-hidden">
      <CardHeader className="bg-zinc-50 dark:bg-zinc-800/50 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Truck className="h-5 w-5 text-blue-600" />
          Shipping Information
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Saved Addresses Picker */}
        {savedAddresses.length > 0 && (
          <div className="mb-8 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <Label className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-4 block">Select a Saved Address</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedAddresses.map((addr) => (
                <div 
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddressId(addr.id)
                    syncFormWithAddress(addr)
                  }}
                  className={`relative cursor-pointer p-4 rounded-lg border-2 transition-all ${
                    selectedAddressId === addr.id 
                      ? "border-blue-600 bg-white dark:bg-zinc-800 shadow-md scale-[1.02]" 
                      : "border-transparent bg-zinc-100/50 dark:bg-zinc-800/50 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{addr.label}</span>
                    {selectedAddressId === addr.id && <Check className="h-4 w-4 text-blue-600" />}
                  </div>
                  <p className="text-sm font-bold truncate">{addr.fullName}</p>
                  <p className="text-xs text-zinc-500 line-clamp-1">{addr.address}</p>
                  <p className="text-xs text-zinc-500">{addr.city}, {addr.state}</p>
                </div>
              ))}
              <div 
                onClick={() => setSelectedAddressId("new")}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                  selectedAddressId === "new" 
                    ? "border-blue-600 bg-white dark:bg-zinc-800" 
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                }`}
              >
                <Plus className="h-5 w-5 text-zinc-400 mb-1" />
                <span className="text-xs font-medium">Use a New Address</span>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleContinueShipping()
          }}
          className="space-y-6"
        >
          <AnimatePresence mode="wait">
            {(selectedAddressId === "new" || savedAddresses.length === 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 overflow-hidden"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" placeholder="John" {...shippingForm.register("firstName")} />
                    {shippingForm.formState.errors.firstName && <p className="text-xs text-red-500">{shippingForm.formState.errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" placeholder="Doe" {...shippingForm.register("lastName")} />
                    {shippingForm.formState.errors.lastName && <p className="text-xs text-red-500">{shippingForm.formState.errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" placeholder="you@example.com" {...shippingForm.register("email")} />
                  {shippingForm.formState.errors.email && <p className="text-xs text-red-500">{shippingForm.formState.errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <Input id="address" placeholder="123 Main Street" {...shippingForm.register("address")} />
                  {shippingForm.formState.errors.address && <p className="text-xs text-red-500">{shippingForm.formState.errors.address.message}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" placeholder="New York" {...shippingForm.register("city")} />
                    {shippingForm.formState.errors.city && <p className="text-xs text-red-500">{shippingForm.formState.errors.city.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province *</Label>
                    <Input id="state" placeholder="NY" {...shippingForm.register("state")} />
                    {shippingForm.formState.errors.state && <p className="text-xs text-red-500">{shippingForm.formState.errors.state.message}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Zip Code *</Label>
                    <Input id="zipCode" placeholder="10001" {...shippingForm.register("zipCode")} />
                    {shippingForm.formState.errors.zipCode && <p className="text-xs text-red-500">{shippingForm.formState.errors.zipCode.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Country *</Label>
                    <Select value={shippingForm.watch("country")} onValueChange={(val) => shippingForm.setValue("country", val)}>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" placeholder="+1 (555) 000-0000" {...shippingForm.register("phone")} />
                  {shippingForm.formState.errors.phone && <p className="text-xs text-red-500">{shippingForm.formState.errors.phone.message}</p>}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Switch id="saveAddress" checked={saveAddress} onCheckedChange={setSaveAddress} />
                  <Label htmlFor="saveAddress" className="text-sm font-medium text-zinc-500 cursor-pointer">Save this address to my profile</Label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <Label htmlFor="orderNotes">Order Notes (optional)</Label>
            <Textarea 
              id="orderNotes" 
              placeholder="Apartment buzzer, gate code, or delivery instructions..." 
              value={orderNotes} 
              onChange={e => setOrderNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <Button type="submit" className="w-full h-12 bg-blue-700 hover:bg-orange-700 text-lg font-bold" disabled={loadingProfile}>
            Continue to Payment
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )

  // ── Step 2: Payment ────────────────────────────────────────────
  const renderPaymentStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={paymentMethod}
          onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
          className="space-y-3"
        >
          {/* bKash */}
          <label
            htmlFor="bkash"
            className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors ${
              paymentMethod === "bkash"
                ? "border-blue-600 bg-blue-50 dark:bg-orange-950/30"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <RadioGroupItem value="bkash" id="bkash" />
            <BkashLogo className="h-8" />
            <div>
              <p className="font-medium">bKash</p>
              <p className="text-xs text-muted-foreground">Pay with your bKash account</p>
            </div>
          </label>

          {/* Nagad */}
          <label
            htmlFor="nagad"
            className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors ${
              paymentMethod === "nagad"
                ? "border-blue-600 bg-blue-50 dark:bg-orange-950/30"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <RadioGroupItem value="nagad" id="nagad" />
            <NagadLogo className="h-8" />
            <div>
              <p className="font-medium">Nagad</p>
              <p className="text-xs text-muted-foreground">Pay with your Nagad account</p>
            </div>
          </label>

          {/* Rocket */}
          <label
            htmlFor="rocket"
            className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors ${
              paymentMethod === "rocket"
                ? "border-blue-600 bg-blue-50 dark:bg-orange-950/30"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <RadioGroupItem value="rocket" id="rocket" />
            <RocketLogo className="h-8" />
            <div>
              <p className="font-medium">Rocket</p>
              <p className="text-xs text-muted-foreground">Pay with your Rocket account</p>
            </div>
          </label>

          {/* Google Pay */}
          <label
            htmlFor="gpay"
            className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors ${
              paymentMethod === "gpay"
                ? "border-blue-600 bg-blue-50 dark:bg-orange-950/30"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <RadioGroupItem value="gpay" id="gpay" />
            <GPayLogo className="h-8" />
            <div>
              <p className="font-medium">Google Pay</p>
              <p className="text-xs text-muted-foreground">Pay with Google Pay</p>
            </div>
          </label>
        </RadioGroup>

        {/* Payment Phone Number */}
        {paymentMethod !== "gpay" && (
          <div className="space-y-2">
            <Label htmlFor="paymentPhone">
              {paymentMethod === "bkash" ? "bKash" : paymentMethod === "nagad" ? "Nagad" : "Rocket"} Phone Number *
            </Label>
            <Input
              id="paymentPhone"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={paymentPhone}
              onChange={(e) => setPaymentPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the phone number linked to your {paymentMethod === "bkash" ? "bKash" : paymentMethod === "nagad" ? "Nagad" : "Rocket"} account.
            </p>
          </div>
        )}

        {/* Mobile Payment Info */}
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Mobile Payment</p>
          </div>
          <p className="text-xs text-muted-foreground">
            After placing your order, you will receive payment instructions via SMS to your phone number ({shippingAddress.phone || "provided above"}). Please complete the payment within 24 hours to confirm your order.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Banknote className="h-3.5 w-3.5" />
            <span>Transaction fee: Free</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => { setPrevStep(step); setStep(1) }}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleContinuePayment}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            Continue to Review
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // ── Step 3: Review ─────────────────────────────────────────────
  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Order Items ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Shipping Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">
              {shippingAddress.firstName} {shippingAddress.lastName}
            </p>
            <p>{shippingAddress.address}</p>
            {shippingAddress.apartment && <p>{shippingAddress.apartment}</p>}
            <p>
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
            </p>
            <p>{COUNTRIES.find((c) => c.value === shippingAddress.country)?.label || shippingAddress.country}</p>
            <p>{shippingAddress.phone}</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {paymentMethod === "bkash" && <BkashLogo className="h-5" />}
            {paymentMethod === "nagad" && <NagadLogo className="h-5" />}
            {paymentMethod === "rocket" && <RocketLogo className="h-5" />}
            {paymentMethod === "gpay" && <GPayLogo className="h-5" />}
            <span className="text-sm font-medium">
              {paymentMethod === "bkash" ? "bKash" : paymentMethod === "nagad" ? "Nagad" : paymentMethod === "gpay" ? "Google Pay" : "Rocket"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Gift Wrapping Option */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-blue-600" />
            Gift Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="giftWrap"
                checked={giftWrap}
                onCheckedChange={(checked) => {
                  setGiftWrap(checked === true)
                  if (!checked) setGiftMessage("")
                }}
                className="data-[state=checked]:bg-blue-600"
              />
              <div>
                <Label htmlFor="giftWrap" className="cursor-pointer font-medium">
                  Add gift wrapping
                </Label>
                <p className="text-xs text-muted-foreground">
                  Beautifully wrapped with a personalized message card
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-blue-600">$4.99</span>
          </div>

          <AnimatePresence>
            {giftWrap && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-4 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="giftMessage" className="text-sm">
                        Gift Message
                      </Label>
                      <span className={`text-xs ${giftMessage.length >= GIFT_MESSAGE_MAX ? "text-red-500" : "text-muted-foreground"}`}>
                        {giftMessage.length}/{GIFT_MESSAGE_MAX}
                      </span>
                    </div>
                    <Textarea
                      id="giftMessage"
                      placeholder="Write a heartfelt message for the recipient..."
                      value={giftMessage}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val.length <= GIFT_MESSAGE_MAX) {
                          setGiftMessage(val)
                        }
                      }}
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  {giftMessage.trim().length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="rounded-lg bg-blue-50 border border-blue-200 dark:bg-orange-950/20 dark:border-orange-900 p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Gift className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                          Message Preview
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground italic leading-relaxed whitespace-pre-line">
                        &ldquo;{giftMessage}&rdquo;
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Order Total Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Savings from sale prices */}
          {savingsFromPrices > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 dark:bg-green-950/30">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                You're saving
              </span>
              <span className="text-sm font-bold text-green-700 dark:text-green-400">
                {formatPrice(savingsFromPrices)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            {shipping === 0 ? (
              <span className="font-medium text-green-600">Free</span>
            ) : (
              <span className="font-medium">{formatPrice(shipping)}</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tax (8%)</span>
            <span className="font-medium">{formatPrice(tax)}</span>
          </div>
          {giftWrap && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gift Wrapping</span>
              <span className="font-medium">{formatPrice(giftWrapCost)}</span>
            </div>
          )}

          {/* Coupon Discount */}
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Coupon ({couponData?.code})
              </span>
              <span className="font-medium text-green-600">
                -{formatPrice(couponDiscount)}
              </span>
            </div>
          )}

          {/* Rewards Redemption */}
          {redeemRewards && redeemedAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Rewards Redemption
              </span>
              <span className="font-medium text-green-600">
                -{formatPrice(redeemedAmount)}
              </span>
            </div>
          )}

          <Separator />
          <div className="flex items-center justify-between text-xl font-bold">
            <span>Total</span>
            <span className="text-blue-600">{formatPrice(totalWithCoupon)}</span>
          </div>

          {/* Coupon Section */}
          <div className="pt-1">
            {couponData && couponData.valid ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-950/30">
                <BadgeCheck className="h-4.5 w-4.5 shrink-0 text-green-600" />
                <span className="flex-1 text-sm font-medium text-green-700 dark:text-green-400">
                  Promo Code Applied: {couponData.code} ({couponData.discountType === 'fixed' ? formatPrice(couponData.discountValue) : `${couponData.discountValue}%`} OFF)
                </span>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-red-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Promo code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleApplyCoupon()
                    }
                  }}
                  className="h-9 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="h-9 shrink-0 text-blue-700 border-blue-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:text-blue-400 dark:border-orange-700"
                >
                  {couponLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Tag className="h-4 w-4 mr-1" />
                  )}
                  Apply
                </Button>
              </div>
            )}
            {couponError && (
              <p className="mt-1.5 text-xs text-destructive">{couponError}</p>
            )}
          </div>

          {/* Rewards Redemption Toggle */}
          {availablePoints > 0 && (
            <div className="pt-1">
              <div className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${redeemRewards ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-muted/30 border-muted'}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 flex items-center justify-center rounded-full ${redeemRewards ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-muted text-muted-foreground'}`}>
                    <Star className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Say Rewards</h4>
                    <p className="text-[10px] text-muted-foreground">You have {availablePoints} points available</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-blue-600">
                    {formatPrice(pointsToValue(availablePoints))}
                  </span>
                  <Switch 
                    id="redeem-rewards-switch"
                    checked={redeemRewards} 
                    onCheckedChange={setRedeemRewards} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Potential Points Banner */}
          <div className="pt-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/40">
              <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-medium text-orange-700 dark:text-orange-400">
                EARN <span className="font-bold text-orange-800 dark:text-orange-300">{potentialPoints} POINTS</span> ON THIS ORDER
              </span>
            </div>
          </div>

          {/* Estimated Delivery */}
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-foreground">Estimated Delivery</p>
              <p className="text-xs text-muted-foreground">
                {deliveryEstimate.min} — {deliveryEstimate.max} (3-5 business days)
              </p>
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <Shield className="h-4 w-4 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-foreground">
                🔒 Secure Checkout
              </p>
              <p className="text-xs text-muted-foreground">
                Your payment info is encrypted and secure
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => { setPrevStep(step); setStep(2) }}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handlePlaceOrder}
          disabled={placingOrder}
          className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          size="lg"
        >
          {placingOrder ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              <Tag className="mr-2 h-4 w-4" />
              Place Order - {formatPrice(totalWithCoupon)}
            </>
          )}
        </Button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-background">
      {/* Decorative Orange Gradient Line */}
      <div className="h-1.5 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-700" />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
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
                  onClick={(e) => { e.preventDefault(); setView({ type: "cart" }) }}
                >
                  Cart
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Checkout</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </nav>

        {/* Title */}
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Checkout</h1>

        {/* Progress Steps */}
        {renderProgress()}

        {/* Security Info Banner */}
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/20">
          <Lock className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-300">
            Your information is encrypted and secure. We never store your payment details.
          </p>
        </div>

        {/* Step Content */}
        {step === 1 && renderShippingStep()}
        {step === 2 && renderPaymentStep()}
        {step === 3 && renderReviewStep()}
      </div>
    </main>
  )
}
