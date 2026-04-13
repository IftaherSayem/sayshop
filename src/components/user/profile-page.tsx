'use client'

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Clock,
  CheckCircle,
  DollarSign,
  Heart,
  GitCompareArrows,
  MapPin,
  CreditCard,
  Settings,
  ChevronRight,
  Calendar,
  Moon,
  Sun,
  Bell,
  Mail,
  Activity,
  Edit,
} from "lucide-react"

// ── Animation Variants ─────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
}

const statCardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.15 + i * 0.1,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

// ── Quick Links Data ──────────────────────────────────────────
const quickLinks = [
  {
    icon: Package,
    title: "My Orders",
    subtitle: "Track and manage your orders",
    view: { type: "orders" as const },
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    icon: Heart,
    title: "My Wishlist",
    subtitle: "Items you've saved for later",
    view: { type: "wishlist" as const },
    color: "text-pink-500",
    bg: "bg-pink-50 dark:bg-pink-950/30",
  },
  {
    icon: GitCompareArrows,
    title: "My Comparisons",
    subtitle: "Side-by-side product comparison",
    view: { type: "compare" as const },
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: MapPin,
    title: "Shipping Addresses",
    subtitle: "Manage your delivery addresses",
    view: null,
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  {
    icon: CreditCard,
    title: "Payment Methods",
    subtitle: "Update your payment options",
    view: null,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    icon: Settings,
    title: "Settings",
    subtitle: "Account and security settings",
    view: null,
    color: "text-muted-foreground",
    bg: "bg-muted/50",
  },
]

export function ProfilePage() {
  const setView = useUIStore((s) => s.setView)
  const { isAuthenticated } = useAuthStore()
  const { theme, setTheme } = useTheme()

  // Wait for Zustand persist to hydrate before checking auth
  const [authHydrated, setAuthHydrated] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setAuthHydrated(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (authHydrated && !isAuthenticated) {
      setView({ type: 'auth' })
    }
  }, [authHydrated, isAuthenticated, setView])

  const [orderCount, setOrderCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Hydration + fetch order count
  useEffect(() => {
    // Mark mounted inside async callback to avoid direct setState in effect body
    const init = async () => {
      setMounted(true)
      try {
        const res = await fetch("/api/orders?limit=100")
        const data = await res.json()
        if (Array.isArray(data.orders)) {
          setOrderCount(data.orders.length)
          return
        }
      } catch {
        // Fallback: try localStorage
        try {
          const stored = localStorage.getItem("say-shop-orders")
          if (stored) {
            const orders = JSON.parse(stored)
            setOrderCount(Array.isArray(orders) ? orders.length : 0)
          }
        } catch {
          // ignore
        }
      }
    }
    init()
  }, [])

  const handleEditProfile = () => {
    toast.info("Profile editing coming soon!")
  }

  const handleQuickLink = (link: (typeof quickLinks)[number]) => {
    if (link.view) {
      setView(link.view)
    } else if (link.title === "Shipping Addresses") {
      toast.info("Address management coming soon!")
    } else if (link.title === "Payment Methods") {
      toast.info("Payment settings coming soon!")
    } else if (link.title === "Settings") {
      toast.info("Account settings coming soon!")
    }
  }

  const isDark = mounted && theme === "dark"

  const initials = "SS" // "Say Shop" initials

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
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
              <BreadcrumbPage>My Account</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </nav>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* ── Profile Header ─────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-8 sm:px-8 sm:py-10">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <Avatar className="h-24 w-24 border-4 border-white/30 shadow-xl sm:h-28 sm:w-28">
                  <AvatarFallback className="bg-white/20 text-3xl font-bold text-white sm:text-4xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center text-white sm:text-left">
                  <h1 className="text-2xl font-bold sm:text-3xl">Say Shop User</h1>
                  <div className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-orange-100 sm:justify-start">
                    <Calendar className="h-4 w-4" />
                    Member since January 2024
                  </div>
                  <Badge className="mt-3 bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <Star className="mr-1 h-3 w-3" />
                    Valued Customer
                  </Badge>
                </div>
                <Button
                  variant="secondary"
                  className="bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm shrink-0"
                  onClick={handleEditProfile}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Order Statistics Dashboard ──────────────────────── */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          {/* Total Orders */}
          <motion.div custom={0} variants={statCardVariants} initial="hidden" animate="visible">
            <Card className="h-full border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
                  <Package className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{orderCount}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Total Orders</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending */}
          <motion.div custom={1} variants={statCardVariants} initial="hidden" animate="visible">
            <Card className="h-full border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                  <Clock className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">0</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Completed */}
          <motion.div custom={2} variants={statCardVariants} initial="hidden" animate="visible">
            <Card className="h-full border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                  <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">0</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Spent */}
          <motion.div custom={3} variants={statCardVariants} initial="hidden" animate="visible">
            <Card className="h-full border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <DollarSign className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">$0.00</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Total Spent</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ── Quick Links ────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <motion.div
                  key={link.title}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="group cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => handleQuickLink(link)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${link.bg}`}>
                        <Icon className={`h-5 w-5 ${link.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.subtitle}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ── Recent Activity ────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-orange-500" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest account activity</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Empty state with decorative timeline */}
              <div className="flex flex-col items-center justify-center py-10">
                <div className="relative">
                  {/* Decorative timeline placeholder */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-3 w-3 rounded-full bg-muted" />
                    <div className="h-16 w-0.5 bg-gradient-to-b from-muted to-muted/30" />
                    <div className="h-3 w-3 rounded-full bg-muted/50" />
                    <div className="h-16 w-0.5 bg-gradient-to-b from-muted/30 to-muted/10" />
                    <div className="h-2 w-2 rounded-full bg-muted/20" />
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <Activity className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">No recent activity</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Your orders, reviews, and other activity will appear here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Preferences ────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-orange-500" />
                Preferences
              </CardTitle>
              <CardDescription>Customize your shopping experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    {isDark ? (
                      <Moon className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Sun className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">
                      {mounted
                        ? isDark
                          ? "Dark theme is active"
                          : "Light theme is active"
                        : "Loading..."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  aria-label="Toggle dark mode"
                />
              </div>

              <Separator />

              {/* Newsletter Toggle */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Mail className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Newsletter</p>
                    <p className="text-xs text-muted-foreground">
                      Receive promotional emails and updates
                    </p>
                  </div>
                </div>
                <Switch
                  defaultChecked
                  onCheckedChange={(checked) => {
                    toast.success(checked ? "Newsletter enabled" : "Newsletter disabled")
                  }}
                  aria-label="Toggle newsletter"
                />
              </div>

              <Separator />

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Bell className="h-4 w-4 text-violet-500" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Order updates and special offers
                    </p>
                  </div>
                </div>
                <Switch
                  defaultChecked
                  onCheckedChange={(checked) => {
                    toast.success(checked ? "Notifications enabled" : "Notifications disabled")
                  }}
                  aria-label="Toggle notifications"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

// Star icon for badge (avoid circular import issues)
function Star({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
  )
}
