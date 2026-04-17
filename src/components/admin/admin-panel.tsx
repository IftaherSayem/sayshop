'use client'

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { formatPrice } from "@/lib/types"
import { parseItems } from "@/lib/types"
import type { OrderItemData, ShippingAddress } from "@/lib/types"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import NextImage from "next/image"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

// Icons
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, LogOut, Shield, Menu, X,
  Search, Plus, Pencil, Trash2, Eye, ChevronDown, AlertTriangle, TrendingUp,
  DollarSign, BarChart3, RefreshCw, MoreHorizontal, Check, ArrowUpDown, Filter,
  ChevronLeft, ChevronRight, Store, Lock, Timer, UserX, Activity, Grid,
  ImagePlus, Link2, Star, GripVertical, ExternalLink, Upload, Loader2
} from "lucide-react"

// shadcn/ui
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { NotificationDropdown } from "@/components/layout/notification-dropdown"

// ───────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  totalUsers: number
  totalCoupons: number
  recentOrders: any[]
  lowStockProducts: any[]
  salesHistory?: { name: string, sales: number }[]
}

interface Category {
  id: string; name: string; slug: string
}

interface AdminProduct {
  id: string; name: string; slug: string; description: string; shortDesc: string | null
  price: number; comparePrice: number | null; images: string; categoryId: string
  brand: string | null; stock: number; rating: number; reviewCount: number
  featured: boolean; active: boolean; tags: string | null; createdAt: string; updatedAt: string
  category?: Category
}

interface AdminOrder {
  id: string; orderNumber: string; status: string; items: string; subtotal: number
  shipping: number; tax: number; total: number; shippingAddress: string
  paymentMethod: string; customerName: string; customerEmail: string
  customerPhone: string | null; notes: string | null; createdAt: string; updatedAt: string
}

interface AdminUser {
  id: string; name: string; email: string; role: string; phone: string | null
  sessionToken: string | null; emailVerified: boolean; createdAt: string
}

interface AdminCoupon {
  id: string; code: string; discountType: 'percent' | 'fixed'; discountValue: number
  productId: string | null; targetUserIds: string[] | null; minOrder: number | null; usageLimit: number | null; usageLimitPerUser: number | null; usedCount: number; isActive: boolean
  expiresAt: string | null; createdAt: string
}

type AdminTab = "dashboard" | "products" | "categories" | "orders" | "users" | "coupons" | "security"

// ───────────────────────────────────────────────────────────
// Sidebar nav items
// ───────────────────────────────────────────────────────────

const navItems: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Grid },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "users", label: "Users", icon: Users },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "security", label: "Security", icon: Lock },
]

// ───────────────────────────────────────────────────────────
// Admin Panel Component
// ───────────────────────────────────────────────────────────

function SidebarNav({ activeTab, onTabChange, onSignOut, role }: {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  onSignOut: () => void
  role?: string
}) {
  return (
    <div className="flex flex-col h-full bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 lg:rounded-3xl shadow-xl shadow-zinc-200/40 dark:shadow-black/40 overflow-hidden">
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0">
          <NextImage src="/images/logo-premium.png" alt="Say Shop" width={40} height={40} className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-lg leading-tight truncate text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 tracking-tight uppercase">Say Shop</h2>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">Enterprise {role || 'Admin'}</p>
        </div>
      </div>
      
      <div className="px-5 pb-4">
        <Separator className="bg-zinc-200/50 dark:bg-zinc-800/50" />
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-2 uppercase tracking-widest">Main Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden ${
                isActive
                  ? "text-white shadow-md shadow-blue-500/20"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={`h-5 w-5 relative z-10 ${isActive ? "text-white" : "group-hover:text-blue-500 transition-colors"}`} />
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </nav>
      
      <div className="p-4 mt-auto">
        <div className="p-4 rounded-2xl bg-gradient-to-b from-white/40 to-white/10 dark:from-zinc-800/40 dark:to-zinc-800/10 border border-white/40 dark:border-zinc-700/50 backdrop-blur-sm">
           <button onClick={onSignOut} className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
              <LogOut className="h-4 w-4" /> Sign Out
           </button>
        </div>
      </div>
    </div>
  )
}

export function AdminPanel() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const hydrated = useAuthStore((s) => s._hydrated)
  const setView = useUIStore((s) => s.setView)
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [verifiedUser, setVerifiedUser] = useState<any>(null)

  const isPrivileged = ((verifiedUser?.role || user?.role || "").toUpperCase().match(/ADMIN|MANAGER|SUPPORT/)) !== null;

  // ── Realtime Database Subscription ──
  useEffect(() => {
    if (!hydrated || !isPrivileged) return

    const supabase = createSupabaseBrowserClient()
    
    // Subscribe to all relevant tables and trigger refresh on any change
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => setRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => setRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => setRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => setRefreshKey(k => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => setRefreshKey(k => k + 1))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hydrated, isPrivileged])

  // Wait for Zustand persist to hydrate, then verify role with server
  useEffect(() => {
    if (!hydrated) return

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) {
          // Not authenticated
          setAccessDenied(true)
          setChecking(false)
          return
        }
        const data = await res.json()
        setVerifiedUser(data.user)
        
        const userRole = data.user?.role?.toUpperCase() || ""
        const isMasterAdmin = data.user?.email?.toLowerCase() === 'admin@sayshop.com'

        if (!data.user || (!['ADMIN', 'MANAGER', 'SUPPORT'].includes(userRole) && !isMasterAdmin)) {
          setAccessDenied(true)
          toast.error("Access denied. Privileged access required.")
          // Delay redirect so user sees the message
          setTimeout(() => setView({ type: "home" }), 1500)
        }
      } catch {
        // Network error, rely on client-side state
      } finally {
        setChecking(false)
      }
    }
    verify()
  }, [hydrated, setView])

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" })
    } catch { /* ignore */ }
    logout()
    setView({ type: "home" })
    toast.success("Signed out of admin panel")
  }

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab)
    setMobileOpen(false)
  }

  const triggerRefresh = () => setRefreshKey(k => k + 1)

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Access denied — show proper message
  if (accessDenied || !isPrivileged) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to access the admin panel. Admin privileges are required.
          </p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setView({ type: "auth" })}>
              Sign In
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setView({ type: "home" })}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 relative overflow-hidden font-sans text-zinc-900 dark:text-zinc-100">
      {/* Decorative ambient background meshes */}
      <div className="pointer-events-none absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 dark:bg-indigo-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-400/20 dark:bg-blue-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      <div className="pointer-events-none absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-pink-300/20 dark:bg-pink-900/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen" />

      <div className="flex h-screen relative z-10 lg:p-4 gap-4">
        {/* Desktop Sidebar (Floating) */}
        <aside className="hidden lg:flex lg:w-[280px] lg:flex-col shrink-0">
          <SidebarNav activeTab={activeTab} onTabChange={handleTabChange} onSignOut={handleSignOut} role={verifiedUser?.role || user?.role} />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] p-2 bg-transparent border-0 shadow-none">
            <SidebarNav activeTab={activeTab} onTabChange={(t) => { handleTabChange(t); setMobileOpen(false); }} onSignOut={handleSignOut} role={verifiedUser?.role || user?.role} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area (Glassmorphic Window) */}
        <div className="flex-1 flex flex-col bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/40 dark:border-zinc-800/40 lg:rounded-3xl shadow-2xl shadow-indigo-500/5 lg:overflow-hidden h-full">
          {/* Top Header */}
          <header className="sticky top-0 z-20 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md border-b border-white/30 dark:border-zinc-800/50 shrink-0">
            <div className="flex items-center justify-between px-6 lg:px-8 h-20">
              <div className="flex items-center gap-4">
                <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-xl bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 shadow-sm border border-white/40 dark:border-zinc-700">
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-white dark:to-zinc-400 capitalize">{activeTab}</h1>
                  <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest hidden sm:block">SayShop Management Console</p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content (Scrollable inside the glass window) */}
          <div 
            className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar p-6 lg:p-8" 
            style={{ scrollbarGutter: 'stable' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.99 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full"
              >
                {activeTab === "dashboard" && (
                  <DashboardTab 
                    refreshKey={refreshKey} 
                    onViewOrders={() => setActiveTab("orders")} 
                  />
                )}
                {activeTab === "products" && <ProductsTab refreshKey={refreshKey} triggerRefresh={triggerRefresh} />}
                {activeTab === "categories" && <CategoriesTab refreshKey={refreshKey} triggerRefresh={triggerRefresh} />}
                {activeTab === "orders" && <OrdersTab refreshKey={refreshKey} triggerRefresh={triggerRefresh} />}
                {activeTab === "users" && <UsersTab refreshKey={refreshKey} triggerRefresh={triggerRefresh} />}
                {activeTab === "coupons" && <CouponsTab refreshKey={refreshKey} triggerRefresh={triggerRefresh} />}
                {activeTab === "security" && <SecurityTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}


// ───────────────────────────────────────────────────────────
// Dashboard Tab
// ───────────────────────────────────────────────────────────

function DashboardTab({ refreshKey, onViewOrders }: { refreshKey: number, onViewOrders: () => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/stats?t=${Date.now()}`)
      if (!res.ok) throw new Error()
      setStats(await res.json())
    } catch {
      toast.error("Failed to load dashboard stats")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats, refreshKey])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`admin-stats-sk-${i}`} className="h-32 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    { label: "Gross Revenue", value: formatPrice(stats.totalRevenue), icon: DollarSign, trend: "+12.5%", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Active Orders", value: stats.totalOrders.toString(), icon: ShoppingCart, trend: "+3.2%", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
    { label: "Inventory Size", value: stats.totalProducts.toString(), icon: Package, trend: null, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-600/10" },
    { label: "Total Customers", value: stats.totalUsers.toString(), icon: Users, trend: "+8.4%", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
    { label: "Active Coupons", value: stats.totalCoupons.toString(), icon: Tag, trend: null, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10" },
  ]

  const chartData = stats.salesHistory || [
    { name: 'Jan', sales: 0 },
    { name: 'Feb', sales: 0 },
    { name: 'Mar', sales: 0 },
    { name: 'Apr', sales: 0 },
    { name: 'May', sales: 0 },
    { name: 'Jun', sales: 0 },
  ]
  const pieData = [
    { name: 'Completed', value: stats.recentOrders.filter(o => o.status === 'completed').length || 1, color: '#3b82f6' },
    { name: 'Pending', value: stats.recentOrders.filter(o => o.status === 'pending').length || 1, color: '#eab308' },
    { name: 'Others', value: stats.recentOrders.filter(o => !['completed', 'pending'].includes(o.status)).length || 0, color: '#f97316' },
  ]

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      
      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(22)
      doc.text("Say Shop - Sales Report", 14, 20)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28)
      
      // Summary Stats
      doc.setFontSize(14)
      doc.setTextColor(0)
      doc.text("Business Overview", 14, 45)
      
      const summaryData = [
        ["Metric", "Total Value"],
        ["Total Revenue", formatPrice(stats.totalRevenue)],
        ["Total Orders", stats.totalOrders.toString()],
        ["Total Products", stats.totalProducts.toString()],
        ["Total Customers", stats.totalUsers.toString()],
      ]
      
      autoTable(doc, {
        startY: 50,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      })
      
      // Recent Transactions
      const finalY = (doc as any).lastAutoTable.finalY + 15
      doc.text("Recent Transactions", 14, finalY)
      
      const tableData = stats.recentOrders.map(o => [
        o.orderNumber,
        o.customerName || o.customerEmail || 'Guest',
        new Date(o.createdAt).toLocaleDateString(),
        formatPrice(o.total),
        o.status.toUpperCase()
      ])
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [["Order #", "Customer", "Date", "Amount", "Status"]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [75, 85, 99] }
      })
      
      // Save
      doc.save(`SayShop_Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success("Sales report exported successfully!")
    } catch (error) {
      console.error("PDF Export error:", error)
      toast.error("Failed to export PDF")
    }
  }

  return (
    <div className="space-y-6 pb-12">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.slice(0,4).map((card, i) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="relative rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 shadow-sm overflow-hidden p-6 hover:shadow-lg transition-all duration-300">
              {/* Subtle top glare */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{card.label}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"><MoreHorizontal className="h-4 w-4" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent><DropdownMenuItem>View Details</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-white tracking-tight">{card.value}</h3>
                  {card.trend && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                      <TrendingUp className="h-3 w-3" />
                      <span>{card.trend} <span className="text-zinc-400 font-medium">vs last month</span></span>
                    </div>
                  )}
                </div>
                
                {/* Mini Chart per card replacing the old static icon box */}
                <div className="h-12 w-20 opacity-70">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                         <Line type="monotone" dataKey={i % 2 === 0 ? "sales" : "traffic"} stroke={i === 0 ? "#10b981" : i === 1 ? "#ef4444" : "#3b82f6"} strokeWidth={2.5} dot={false} />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Sales Chart */}
        <div className="lg:col-span-2 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 shadow-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold font-display text-zinc-900 dark:text-white">Sales Report</h2>
            <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
              <span className="hover:text-blue-500 cursor-pointer">12 MONTHS</span>
              <span className="hover:text-blue-500 cursor-pointer">6 MONTHS</span>
              <span className="text-blue-500 cursor-pointer border-b-2 border-blue-500 pb-1">30 DAYS</span>
              <span className="hover:text-blue-500 cursor-pointer">7 DAYS</span>
              <button 
                onClick={handleExportPDF}
                className="ml-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> EXPORT PDF
              </button>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)'}} />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={4} activeDot={{ r: 8, fill: "#3b82f6", stroke: "#fff", strokeWidth: 3 }} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Sources / Pie Chart */}
        <div className="rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 shadow-sm p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-lg font-bold font-display text-zinc-900 dark:text-white">Order Status Distribution</h2>
             <span className="text-zinc-400"><MoreHorizontal className="h-5 w-5" /></span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Absolute center text inside donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-blue-500">
                {Math.round((stats.recentOrders.filter(o => o.status === 'completed').length / (stats.recentOrders.length || 1)) * 100)}%
              </span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Completed</span>
            </div>
            
            {/* Legend underneath */}
            <div className="w-full mt-4 space-y-3">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">{d.name}</span>
                  </div>
                  <span className="font-bold text-zinc-900 dark:text-white">{d.value} Orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-4">
        {/* Recent Customers replacing Recent Orders table styling */}
        <div className="rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 shadow-sm p-6 overflow-hidden">
          <div className="flex flex-row items-center justify-between pb-6">
            <h2 className="text-lg font-bold font-display text-zinc-900 dark:text-white">Recent Transactions</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewOrders}
              className="text-sm font-semibold text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full px-4"
            >
              View All →
            </Button>
          </div>
          <div className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-zinc-500 py-4 border-b-0">Product</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Orders ID</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Customer Name</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 text-right border-b-0">Price</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 text-center border-b-0">Statues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-zinc-400 py-12 border-b-0">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 opacity-20" />
                          <p className="text-sm font-medium">No order data available</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.recentOrders.map((order: AdminOrder) => (
                      <TableRow key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800/30 transition-all border-dashed">
                        <TableCell className="w-12">
                           <div className="h-10 w-10 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700 flex items-center justify-center p-2">
                              <Package className="h-5 w-5 text-zinc-400" />
                           </div>
                        </TableCell>
                        <TableCell className="font-semibold text-sm text-zinc-900 dark:text-zinc-300">#{order.orderNumber.slice(-6)}</TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{order.customerName}</span>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit'})}</TableCell>
                        <TableCell className="text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right tabular-nums">{formatPrice(order.total)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`font-semibold border-0 text-[11px] px-2 py-1 ${order.status.toLowerCase() === 'delivered' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                             {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Inventory Management Section */}
        <div className="space-y-6">
          <Card className="border-zinc-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
            <CardHeader className="pb-3 border-b border-zinc-50 dark:border-zinc-800/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold">Stock Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[280px]">
                {stats.lowStockProducts.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <Check className="h-10 w-10 mx-auto mb-3 text-emerald-500/30" />
                    <p className="text-sm font-medium">Stock levels healthy</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                    {stats.lowStockProducts.map((p: AdminProduct & { category?: { name: string } }) => (
                      <div key={p.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{p.name}</p>
                          <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-tighter">{p.category?.name || "Uncategorized"}</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <Badge variant={p.stock === 0 ? "destructive" : "secondary"} className={`text-[10px] font-bold px-1.5 py-0 ${p.stock === 0 ? "animate-pulse" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-none"}`}>
                            {p.stock} units
                          </Badge>
                          <div className="w-16 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${p.stock === 0 ? "bg-red-500" : "bg-amber-500"}`} 
                              style={{ width: `${Math.min(100, (p.stock / 10) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t border-zinc-50 dark:border-zinc-800/50">
                <Button variant="outline" size="sm" className="w-full text-xs h-9 font-bold border-zinc-200 dark:border-zinc-700">
                  Manage Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card className="border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-500/5 shadow-none">
            <CardContent className="p-4">
              <h4 className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-3">System Health</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-800 dark:text-emerald-500 font-medium">Real-time Sync</span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-800 dark:text-emerald-500 font-medium">Database Refresh</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">Auto-reactive</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Products Tab
// ───────────────────────────────────────────────────────────

function ProductsTab({ refreshKey, triggerRefresh }: { refreshKey: number; triggerRefresh: () => void }) {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [stockEdit, setStockEdit] = useState<{ id: string; stock: number } | null>(null)
  
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "15", t: Date.now().toString() })
      if (search) params.set("search", search)
      if (catFilter) params.set("categoryId", catFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/admin/products?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProducts(data.products)
      setTotal(data.total)
    } catch {
      toast.error("Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [page, search, catFilter, statusFilter, refreshKey])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories")
      if (res.ok) setCategories(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts, refreshKey])
  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const handleToggleActive = async (product: AdminProduct) => {
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, active: !product.active }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Product ${!product.active ? "activated" : "deactivated"}`)
      triggerRefresh()
    } catch {
      toast.error("Failed to update product")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to delete product")
        return
      }
      toast.success("Product deleted")
      triggerRefresh()
    } catch {
      toast.error("Failed to delete product")
    }
  }

  const handleSaveStock = async (id: string, stock: number) => {
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stock }),
      })
      if (!res.ok) throw new Error()
      toast.success("Stock updated")
      setStockEdit(null)
      triggerRefresh()
    } catch {
      toast.error("Failed to update stock")
    }
  }

  const totalPages = Math.ceil(total / 15)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
        <div className="flex gap-2 flex-1 min-w-0 sm:max-w-sm">
            <div className="relative w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
               <Input placeholder="Search products..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="h-10 pl-9 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 shadow-sm focus-visible:ring-blue-500" />
            </div>
          </div>
          <Select value={catFilter} onValueChange={(v) => { setCatFilter(v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="w-40 h-10 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 shadow-sm focus:ring-blue-500"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-32 h-10 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 shadow-sm focus:ring-blue-500"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-md shadow-blue-500/20 px-4">
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 shadow-sm p-6 overflow-hidden mt-4">
        <div className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-zinc-500 py-4 border-b-0">Product</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Price</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Stock</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRow key={`admin-prod-sk-${i}`} className="border-b-0"><TableCell colSpan={6}><Skeleton className="h-10 rounded-xl" /></TableCell></TableRow>)
                ) : products.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-zinc-400 border-b-0">No products found</TableCell></TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800/30 transition-all border-dashed">
                      <TableCell className="w-1/3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0 border border-zinc-100 dark:border-zinc-700 shadow-sm p-1">
                            {(() => {
                              try {
                                if (!p.images) return p.name.charAt(0);
                                const imgs = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                                if (Array.isArray(imgs) && imgs.length > 0) {
                                  const src = imgs[0]?.url || imgs[0];
                                  if (typeof src === 'string') {
                                    return (
                                      <img 
                                        src={src} 
                                        alt={p.name} 
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )
                                  }
                                }
                              } catch (err) {
                                console.error('Image parse error:', err);
                              }
                              return p.name.charAt(0)
                            })()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[180px]">{p.name}</p>
                            {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.category?.name || "-"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{formatPrice(p.price)}</p>
                          {p.comparePrice && p.comparePrice > p.price && (
                            <p className="text-xs text-muted-foreground line-through">{formatPrice(p.comparePrice)}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {stockEdit?.id === p.id ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" value={stockEdit.stock} onChange={(e) => setStockEdit({ ...stockEdit, stock: parseInt(e.target.value) || 0 })} className="w-16 h-8 text-xs rounded-lg" />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => handleSaveStock(p.id, stockEdit.stock)}>
                              <Check className="h-4 w-4 text-emerald-500" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setStockEdit(null)}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setStockEdit({ id: p.id, stock: p.stock })}>
                            <Badge variant="outline" className={`font-semibold border-0 text-[11px] px-2 py-1 ${p.stock > 10 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : p.stock > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                              {p.stock} in stock
                            </Badge>
                            <Pencil className="h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-semibold border-0 text-[11px] px-2 py-1 ${p.active ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                          {p.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-white/40 dark:border-zinc-800/50">
                            <DropdownMenuItem onClick={() => setEditProduct(p)} className="rounded-lg cursor-pointer hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(p)} className="rounded-lg cursor-pointer">
                              {p.active ? <X className="h-3.5 w-3.5 mr-2" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                              {p.active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                            <DropdownMenuItem className="text-red-600 rounded-lg cursor-pointer focus:text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-zinc-500 font-medium">{total} products</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/40 dark:border-zinc-800/50 shadow-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-bold flex items-center px-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-white/40 dark:border-zinc-800/50">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/40 dark:border-zinc-800/50 shadow-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Create / Edit Product Modal */}
      <ProductModal
        open={isCreateOpen || !!editProduct}
        onClose={() => { setIsCreateOpen(false); setEditProduct(null) }}
        product={editProduct}
        categories={categories}
        onSave={() => { setIsCreateOpen(false); setEditProduct(null); triggerRefresh() }}
      />
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Image Manager (used inside ProductModal)
// ───────────────────────────────────────────────────────────

interface ProductImageEntry { url: string; alt: string }

function parseImageList(raw: string): ProductImageEntry[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: unknown) => {
      if (typeof item === 'string') return { url: item, alt: '' }
      if (typeof item === 'object' && item !== null && 'url' in item)
        return { url: (item as ProductImageEntry).url || '', alt: (item as ProductImageEntry).alt || '' }
      return null
    }).filter((x): x is ProductImageEntry => x !== null && x.url.trim() !== '')
  } catch {
    return []
  }
}

function ImageManager({ value, onChange }: { value: string; onChange: (json: string) => void }) {
  const [images, setImages] = useState<ProductImageEntry[]>(() => parseImageList(value))
  const [urlInput, setUrlInput] = useState('')
  const [altInput, setAltInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set())

  // Update both local state and parent state
  const syncChanges = useCallback((newList: ProductImageEntry[]) => {
    setImages(newList)
    onChange(JSON.stringify(newList))
  }, [onChange])

  // Re-parse ONLY when value prop actually changes from the outside (e.g. product changed)
  useEffect(() => {
    const nextImages = parseImageList(value)
    if (JSON.stringify(nextImages) !== JSON.stringify(images)) {
      setImages(nextImages)
      setImgErrors(new Set())
    }
  }, [value]) // Only depend on value to prevent feedback loops

  const addImage = useCallback((url: string, alt: string = '') => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return
    
    setImages(prev => {
      if (prev.some(img => img.url === trimmedUrl)) return prev
      const next = [...prev, { url: trimmedUrl, alt: alt.trim() }]
      // Use a small timeout to ensure the parent is notified after the state transition
      setTimeout(() => onChange(JSON.stringify(next)), 0)
      return next
    })
  }, [onChange])

  const handleManualAdd = () => {
    const url = urlInput.trim()
    if (!url) { setUrlError('Please enter an image URL'); return }
    try { new URL(url) } catch { setUrlError('Enter a valid URL (must start with http:// or https://)'); return }
    addImage(url, altInput)
    setUrlInput('')
    setAltInput('')
    setUrlError('')
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    const supabase = createSupabaseBrowserClient()

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`)
          continue
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
        const filePath = fileName // Save to root of bucket

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Supabase upload error:', uploadError)
          throw new Error(uploadError.message || "Upload failed")
        }

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)

        // Add to local state immediately so user sees progress
        const entry = { url: publicUrl, alt: '' }
        setImages(prev => {
          const next = [...prev, entry]
          setTimeout(() => onChange(JSON.stringify(next)), 0)
          return next
        })
      }
      toast.success("Images uploaded successfully")
    } catch (err: any) {
      console.error(err)
      toast.error(`Upload failed: ${err.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx)
    syncChanges(next)
    setImgErrors(prev => { const s = new Set(prev); s.delete(idx); return s })
  }

  const setCover = (idx: number) => {
    if (idx === 0) return
    const next = [...images]
    const [item] = next.splice(idx, 1)
    syncChanges([item, ...next])
  }

  const updateAlt = (idx: number, alt: string) => {
    const next = images.map((img, i) => i === idx ? { ...img, alt } : img)
    syncChanges(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-base font-bold">
          <ImagePlus className="h-5 w-5 text-blue-600" />
          Product Media
        </Label>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
          {images.length} / 10 Images
        </span>
      </div>

      {/* --- Upload & URL Area --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files) }}
          className={`relative group flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed transition-all duration-300 ${
            isDragging 
              ? 'border-blue-600 bg-blue-600/5 ring-4 ring-blue-600/10' 
              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={uploading}
          />
          <div className={`p-3 rounded-full ${uploading ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-blue-100 dark:bg-blue-600/10'} transition-colors`}>
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            ) : (
              <Upload className="h-6 w-6 text-blue-700 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {uploading ? 'Uploading Files...' : 'Click or Drop images'}
            </p>
            <p className="text-[11px] text-zinc-500 font-medium">PNG, JPG up to 5MB</p>
          </div>
        </div>

        {/* URL Input */}
        <div className="flex flex-col gap-3 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
          <div className="flex items-center gap-1.5 mb-1">
            <Link2 className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">External Image URL</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError('') }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleManualAdd())}
              className={`h-10 text-sm rounded-xl bg-zinc-50/50 border-zinc-200 dark:border-zinc-800 ${urlError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
            />
            <Button type="button" size="sm" onClick={handleManualAdd} className="bg-zinc-900 dark:bg-white dark:text-zinc-900 rounded-xl px-4 h-10 shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Image label (e.g. Back view)"
            value={altInput}
            onChange={(e) => setAltInput(e.target.value)}
            className="h-8 text-[11px] border-none bg-zinc-100/50 dark:bg-transparent px-0 focus-visible:ring-0"
          />
          {urlError && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{urlError}</p>}
        </div>
      </div>

      {/* --- Image Preview List (Draggable) --- */}
      <div className="space-y-2 relative">
        {images.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl opacity-50 bg-zinc-50/30 dark:bg-transparent">
            <ImagePlus className="h-10 w-10 mb-2 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-400">Your product media will appear here</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={images} onReorder={syncChanges} className="space-y-2">
            {images.map((img, idx) => (
              <Reorder.Item
                key={`${img.url}-${idx}`}
                value={img}
                className={`relative flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                  idx === 0
                    ? 'border-blue-200 bg-blue-50/30 dark:bg-blue-600/5 dark:border-blue-600/20'
                    : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 hover:border-zinc-200 dark:hover:border-zinc-700'
                }`}
              >
                <GripVertical className="h-4 w-4 text-zinc-300 shrink-0" />

                <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 shrink-0">
                  {imgErrors.has(idx) ? (
                    <div className="h-full w-full flex items-center justify-center"><ImagePlus className="h-6 w-6 text-zinc-300" /></div>
                  ) : (
                    <img
                      src={img.url}
                      alt={img.alt || 'Product'}
                      className="h-full w-full object-cover"
                      onError={() => setImgErrors(prev => new Set([...prev, idx]))}
                    />
                  )}
                  {idx === 0 && (
                    <div className="absolute top-0 right-0 p-1">
                      <Star className="h-3 w-3 fill-blue-600 text-blue-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-zinc-300 tabular-nums">0{idx + 1}</span>
                    <p className="text-[11px] font-bold text-zinc-400 truncate max-w-[200px]">{img.url}</p>
                  </div>
                  <Input
                    value={img.alt}
                    onChange={(e) => updateAlt(idx, e.target.value)}
                    placeholder="Enter image description..."
                    className="h-7 text-xs border-none bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-2 focus-visible:ring-1 focus-visible:ring-zinc-200"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <a href={img.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {idx !== 0 && (
                    <button type="button" onClick={() => setCover(idx)} className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-600/10 transition-colors">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => removeImage(idx)} className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
        <AlertTriangle className="h-4 w-4 text-zinc-400 mt-0.5" />
        <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
          Tip: Drag the images to change their order. The first image will be your main product thumbnail. Images uploaded via drag & drop are stored in your project storage.
        </p>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Product Modal
// ───────────────────────────────────────────────────────────

function ProductModal({ open, onClose, product, categories, onSave }: {
  open: boolean; onClose: () => void; product: AdminProduct | null; categories: Category[]; onSave: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "", slug: "", description: "", shortDesc: "", price: "", comparePrice: "",
    categoryId: "", brand: "", stock: "100", tags: "", images: "[]", featured: false, active: true,
  })

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name, slug: product.slug, description: product.description,
        shortDesc: product.shortDesc || "", price: product.price.toString(),
        comparePrice: product.comparePrice?.toString() || "", categoryId: product.categoryId,
        brand: product.brand || "", stock: product.stock.toString(),
        tags: product.tags || "", images: product.images, featured: product.featured, active: product.active,
      })
    } else {
      setForm({ name: "", slug: "", description: "", shortDesc: "", price: "", comparePrice: "", categoryId: "", brand: "", stock: "100", tags: "", images: "[]", featured: false, active: true })
    }
  }, [product, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.categoryId || !form.slug) {
      toast.error("Name, slug, price, and category are required")
      return
    }

    setSaving(true)
    try {
      const isEdit = !!product
      const res = await fetch("/api/admin/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isEdit ? { id: product.id } : {}), ...form }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.details || err.error || "Failed to save product")
      }
      toast.success(`Product ${isEdit ? "updated" : "created"}`)
      onSave()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save product")
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (field: string, value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>{product ? "Update product details" : "Create a new product listing"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => { updateForm("name", e.target.value); updateForm("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) }} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => updateForm("brand", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => updateForm("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price ($) *</Label>
              <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => updateForm("price", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Compare Price ($) <span className="text-muted-foreground font-normal">original</span></Label>
              <Input type="number" step="0.01" min="0" value={form.comparePrice} onChange={(e) => updateForm("comparePrice", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input type="number" min="0" value={form.stock} onChange={(e) => updateForm("stock", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags <span className="text-muted-foreground font-normal">comma-separated</span></Label>
              <Input value={form.tags} onChange={(e) => updateForm("tags", e.target.value)} placeholder="e.g. sale, new, wireless" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Input value={form.shortDesc} onChange={(e) => updateForm("shortDesc", e.target.value)} placeholder="Brief one-liner shown in cards" />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={3} placeholder="Full product description" />
          </div>

          {/* Image Manager */}
          <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
            <ImageManager
              value={form.images}
              onChange={(json) => updateForm("images", json)}
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.active} onCheckedChange={(v) => updateForm("active", v)} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.featured} onCheckedChange={(v) => updateForm("featured", v)} />
              Featured
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
              {product ? "Update Product" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────────────────────────────────────
// Orders Tab
// ───────────────────────────────────────────────────────────

function OrdersTab({ refreshKey, triggerRefresh }: { refreshKey: number; triggerRefresh: () => void }) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [viewOrder, setViewOrder] = useState<AdminOrder | null>(null)

  // Debounce search input to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400) // 400ms delay
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ 
        page: page.toString(), 
        limit: "15", 
        t: Date.now().toString() 
      })
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      
      const res = await fetch(`/api/admin/orders?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setOrders(data.orders)
      setTotal(data.total)
    } catch {
      toast.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders, refreshKey])

  const totalPages = Math.ceil(total / 15)

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success("Order status updated")
      triggerRefresh()
      if (viewOrder?.id === orderId) {
        const updated = await res.json()
        setViewOrder({ ...viewOrder, status: updated.status })
      }
    } catch {
      toast.error("Failed to update order status")
    }
  }

  const handleExportPDF = async () => {
    if (!orders || orders.length === 0) {
      toast.error("No orders to export")
      return
    }

    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      
      const doc = new jsPDF()
      
      doc.setFontSize(22)
      doc.text("Say Shop - Orders Export", 14, 20)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28)
      
      const headers = ["Order #", "Customer", "Email", "Total", "Payment", "Status", "Date"]
      const data = orders.map(o => [
        o.orderNumber.slice(-8),
        o.customerName,
        o.customerEmail,
        formatPrice(o.total),
        (o.paymentMethod || "COD").replace(/_/g, " ").toUpperCase(),
        o.status.toUpperCase(),
        new Date(o.createdAt).toLocaleDateString('en-GB')
      ])

      autoTable(doc, {
        startY: 35,
        head: [headers],
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      })

      doc.save(`sayshop_orders_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success("Orders exported to PDF")
    } catch (err) {
      toast.error("Failed to export PDF.")
    }
  }

  const statuses = ["pending", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"]

  return (
    <div className="space-y-4">
      {/* Status Filters & Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "" ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(""); setPage(1) }}
            className={`h-9 px-4 rounded-xl shadow-sm transition-all duration-300 ${statusFilter === "" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-blue-500/20" : "bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-zinc-800/80"}`}
          >
            All
          </Button>
          {statuses.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`h-9 px-4 rounded-xl shadow-sm capitalize transition-all duration-300 ${statusFilter === s ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-blue-500/20" : "bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-zinc-800/80"}`}
            >
              {s.replace(/_/g, " ")}
            </Button>
          ))}
        </div>

        {/* Search & Export */}
        <div className="flex gap-2 min-w-0 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Search className="h-4 w-4 text-zinc-400" />}
            </div>
            <Input 
              placeholder="Search orders..." 
              value={searchInput} 
              onChange={(e) => setSearchInput(e.target.value)} 
              className="h-10 pl-9 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 shadow-sm focus-visible:ring-blue-500 w-full" 
            />
          </div>
          
          <Button 
            onClick={handleExportPDF}
            variant="outline" 
            className="h-10 px-4 shrink-0 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 shadow-sm hover:bg-white/80 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap hidden sm:flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden lg:inline">Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 shadow-sm p-6 overflow-hidden mt-4">
        <div className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-zinc-500 py-4 border-b-0">Order #</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Total</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Payment</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRow key={`admin-order-sk-${i}`} className="border-b-0"><TableCell colSpan={7}><Skeleton className="h-10 rounded-xl" /></TableCell></TableRow>)
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-zinc-400 border-b-0">No orders found</TableCell></TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800/30 transition-all border-dashed">
                      <TableCell>
                        <button onClick={() => setViewOrder(o)} className="font-mono text-xs font-bold text-blue-500 hover:text-blue-600 hover:underline cursor-pointer">
                          #{o.orderNumber.slice(-8)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{o.customerName}</p>
                        <p className="text-xs text-zinc-500">{o.customerEmail}</p>
                      </TableCell>
                      <TableCell className="text-sm font-bold tabular-nums">{formatPrice(o.total)}</TableCell>
                      <TableCell className="text-xs font-semibold capitalize text-zinc-600 dark:text-zinc-400">{(o.paymentMethod || "COD").replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <Select value={o.status} onValueChange={(v) => handleStatusUpdate(o.id, v)}>
                          <SelectTrigger className="h-8 w-36 text-xs rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus:ring-blue-500">
                            <OrderStatusBadge status={o.status} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl border-white/40 dark:border-zinc-800/50">
                            {statuses.map((s) => <SelectItem key={s} value={s} className="rounded-lg">{s.replace(/_/g, " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 font-medium tabular-nums">{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit'})}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setViewOrder(o)}>
                          <Eye className="h-4 w-4 text-zinc-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-zinc-500 font-medium">{total} orders</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/40 dark:border-zinc-800/50 shadow-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-bold flex items-center px-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-white/40 dark:border-zinc-800/50">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/40 dark:border-zinc-800/50 shadow-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {viewOrder?.orderNumber.slice(-8)}</DialogTitle>
            <DialogDescription>{new Date(viewOrder?.createdAt || "").toLocaleString()}</DialogDescription>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-sm font-medium">{viewOrder.customerName}</p>
                  <p className="text-xs text-muted-foreground">{viewOrder.customerEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="text-sm capitalize">{(viewOrder.paymentMethod || "cod").replace(/_/g, " ")}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Shipping Address</p>
                {(() => {
                  const addr = (typeof viewOrder.shippingAddress === 'object' ? viewOrder.shippingAddress : (() => { try { return JSON.parse(viewOrder.shippingAddress) } catch { return null } })()) as ShippingAddress | null;
                  return addr ? (
                    <p className="text-sm">{addr.address}, {addr.city}, {addr.state} {addr.zipCode}</p>
                  ) : (
                    <p className="text-sm">{typeof viewOrder.shippingAddress === 'string' ? viewOrder.shippingAddress : JSON.stringify(viewOrder.shippingAddress)}</p>
                  )
                })()}
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-2">Items</p>
                <div className="space-y-2">
                  {(() => {
                    const items = parseItems<OrderItemData>(viewOrder.items)
                    return items.map((item, i) => (
                      <div key={item.productId || `item-${i}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs shrink-0">📦</div>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(viewOrder.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatPrice(viewOrder.shipping)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatPrice(viewOrder.tax)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Total</span><span>{formatPrice(viewOrder.total)}</span></div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                <Select value={viewOrder.status} onValueChange={(v) => handleStatusUpdate(viewOrder.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {viewOrder.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{viewOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Users Tab
// ───────────────────────────────────────────────────────────

function UsersTab({ refreshKey, triggerRefresh }: { refreshKey: number; triggerRefresh: () => void }) {
  const { user: currentUser } = useAuthStore()
  const currentUserRole = currentUser?.role?.toUpperCase() || ""
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ userId: string; userName: string; newRole: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "15", t: Date.now().toString() })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUsers(data.users)
      setTotal(data.total)
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchUsers() }, [fetchUsers, refreshKey])

  const handleRoleChange = async () => {
    if (!confirmRoleChange) return
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: confirmRoleChange.userId, role: confirmRoleChange.newRole }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${confirmRoleChange.userName} is now ${confirmRoleChange.newRole}`)
      setConfirmRoleChange(null)
      triggerRefresh()
    } catch {
      toast.error("Failed to update user role")
    }
  }

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const totalPages = Math.ceil(total / 15)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 min-w-0 sm:max-w-sm w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search users..." 
              value={searchInput} 
              onChange={(e) => setSearchInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} 
              className="h-10 pl-9 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 shadow-sm focus-visible:ring-blue-500 w-full" 
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 shadow-sm p-6 overflow-hidden mt-4">
        <div className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-zinc-500 py-4 border-b-0">User</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Email</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Joined</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Session</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRow key={`admin-user-sk-${i}`} className="border-b-0"><TableCell colSpan={6}><Skeleton className="h-10 rounded-xl" /></TableCell></TableRow>)
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-zinc-400 border-b-0">No users found</TableCell></TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800/30 transition-all border-dashed">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/20 flex items-center justify-center text-white text-sm font-bold shrink-0 border border-blue-400">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{u.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500 font-medium">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-semibold border-0 text-[11px] px-2 py-1 ${u.role === "ADMIN" ? 'bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-400' : u.role === "MANAGER" ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 font-medium tabular-nums">{new Date(u.createdAt).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-semibold border-0 text-[10px] px-2 py-0.5 ${u.sessionToken ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600'}`}>
                          {u.sessionToken ? "Active" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const targetRole = u.role?.toUpperCase() || "";
                          const isSelf = u.id === currentUser?.id;
                          const canManage = currentUserRole === "ADMIN" || 
                            (currentUserRole === "MANAGER" && !["ADMIN", "MANAGER"].includes(targetRole));

                          if (!canManage || isSelf) {
                            return <Button variant="ghost" size="icon" disabled className="h-8 w-8 opacity-20"><MoreHorizontal className="h-4 w-4" /></Button>;
                          }

                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-white/40 dark:border-zinc-800/50">
                                <DropdownMenuLabel className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Permissions</DropdownMenuLabel>
                                {currentUserRole === "ADMIN" && (
                                  <DropdownMenuItem onClick={() => setConfirmRoleChange({ userId: u.id, userName: u.name, newRole: "ADMIN" })} disabled={u.role === "ADMIN"} className="rounded-lg cursor-pointer">
                                    <Shield className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                    Make Admin
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setConfirmRoleChange({ userId: u.id, userName: u.name, newRole: "MANAGER" })} disabled={u.role === "MANAGER"} className="rounded-lg cursor-pointer">
                                  <Store className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                  Make Manager
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setConfirmRoleChange({ userId: u.id, userName: u.name, newRole: "SUPPORT" })} disabled={u.role === "SUPPORT"} className="rounded-lg cursor-pointer">
                                  <Activity className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                                  Make Support
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                                <DropdownMenuItem onClick={() => setConfirmRoleChange({ userId: u.id, userName: u.name, newRole: "CUSTOMER" })} disabled={u.role === "CUSTOMER"} className="rounded-lg cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50">
                                  <Users className="h-3.5 w-3.5 mr-2" />
                                  Revoke
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-zinc-500 font-medium">{total} users</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/40 dark:border-zinc-800/50 shadow-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-bold flex items-center px-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-white/40 dark:border-zinc-800/50">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/40 dark:border-zinc-800/50 shadow-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Confirm Role Change Dialog */}
      <Dialog open={!!confirmRoleChange} onOpenChange={() => setConfirmRoleChange(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to make <strong>{confirmRoleChange?.userName}</strong> a{" "}
              <strong>{confirmRoleChange?.newRole}</strong>?
            </DialogDescription>
          </DialogHeader>
          {confirmRoleChange?.newRole === "ADMIN" && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>This will grant full admin access to this user.</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRoleChange(null)}>Cancel</Button>
            <Button 
              variant={confirmRoleChange?.newRole === "CUSTOMER" ? "destructive" : "default"} 
              onClick={handleRoleChange} 
              className={confirmRoleChange?.newRole === "ADMIN" ? "bg-blue-600 hover:bg-blue-700" : 
                         confirmRoleChange?.newRole === "MANAGER" ? "bg-blue-500 hover:bg-blue-600" : 
                         confirmRoleChange?.newRole === "SUPPORT" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Coupons Tab
// ───────────────────────────────────────────────────────────

function CouponsTab({ refreshKey, triggerRefresh }: { refreshKey: number; triggerRefresh: () => void }) {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [editCoupon, setEditCoupon] = useState<AdminCoupon | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20", t: Date.now().toString() })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/coupons?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCoupons(data.coupons)
      setTotal(data.total)
    } catch {
      toast.error("Failed to load coupons")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchCoupons() }, [fetchCoupons, refreshKey])

  const handleToggleActive = async (coupon: AdminCoupon) => {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update coupon status")
      }
      toast.success(`Coupon ${!coupon.isActive ? "activated" : "deactivated"}`)
      fetchCoupons()
    } catch (err: any) {
      toast.error(err.message || "Failed to update coupon status")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Coupon deleted")
      triggerRefresh()
    } catch {
      toast.error("Failed to delete coupon")
    }
  }

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 min-w-0 sm:max-w-sm w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search coupons..." 
              value={searchInput} 
              onChange={(e) => setSearchInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} 
              className="h-10 pl-9 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 shadow-sm focus-visible:ring-blue-500 w-full" 
            />
          </div>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-md shadow-blue-500/20 px-4">
          <Plus className="h-4 w-4 mr-2" /> Add Coupon
        </Button>
      </div>

      <div className="rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 shadow-sm p-6 overflow-hidden mt-4">
        <div className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-zinc-500 py-4 border-b-0">Code</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Target</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Discount</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Min Order</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Usage</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRow key={`admin-coupon-sk-${i}`} className="border-b-0"><TableCell colSpan={7}><Skeleton className="h-10 rounded-xl" /></TableCell></TableRow>)
                ) : coupons.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-zinc-400 border-b-0">No coupons found</TableCell></TableRow>
                ) : (
                  coupons.map((c) => (
                    <TableRow key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800/30 transition-all border-dashed">
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs font-bold border border-blue-400/30 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md">{c.code}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.productId ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-blue-700 dark:text-blue-400">Product Only</span>
                            <span className="text-zinc-500 truncate max-w-[100px]" title={c.productId}>{c.productId.slice(0, 8)}...</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 font-medium">Storewide</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.targetUserIds && c.targetUserIds.length > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{c.targetUserIds.length} Targeted Users</span>
                            <span className="text-zinc-500 truncate max-w-[100px]" title={c.targetUserIds.join(', ')}>{c.targetUserIds[0].slice(0, 8)}...</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 font-medium">Public</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {c.discountType === 'percent' ? `${c.discountValue}%` : formatPrice(c.discountValue)}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-400 tabular-nums font-medium">{c.minOrder ? formatPrice(c.minOrder) : "-"}</TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-400 font-medium tabular-nums">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-semibold border-0 text-[11px] px-2 py-1 ${c.isActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-white/40 dark:border-zinc-800/50">
                            <DropdownMenuItem onClick={() => setEditCoupon(c)} className="rounded-lg cursor-pointer hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(c)} className="rounded-lg cursor-pointer">
                              {c.isActive ? <X className="h-3.5 w-3.5 mr-2" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                              {c.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                            <DropdownMenuItem className="text-red-600 rounded-lg cursor-pointer focus:text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-zinc-500 font-medium">{total} coupons</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/40 dark:border-zinc-800/50 shadow-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-bold flex items-center px-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-white/40 dark:border-zinc-800/50">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/40 dark:border-zinc-800/50 shadow-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      <CouponModal
        open={isCreateOpen || !!editCoupon}
        onClose={() => { setIsCreateOpen(false); setEditCoupon(null) }}
        coupon={editCoupon}
        onSave={() => { setIsCreateOpen(false); setEditCoupon(null); triggerRefresh() }}
      />
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Coupon Modal
// ───────────────────────────────────────────────────────────

function CouponModal({ open, onClose, coupon, onSave }: {
  open: boolean; onClose: () => void; coupon: AdminCoupon | null; onSave: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: "", discountType: "percent", discountValue: "", minOrder: "", usageLimit: "", usageLimitPerUser: "", isActive: true,
    expiresAt: "", productId: "none", targetUserIds: [] as string[]
  })
  const [products, setProducts] = useState<AdminProduct[]>([])
  
  // Targeting mode
  const [isSpecificMode, setIsSpecificMode] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Search state for users
  const [userSearch, setUserSearch] = useState("")
  const [userSearchResults, setUserSearchResults] = useState<AdminUser[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const fetchUsers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setUserSearchResults([])
      return
    }
    setSearchingUsers(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setUserSearchResults(data.users || [])
      }
    } finally {
      setSearchingUsers(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch) fetchUsers(userSearch)
    }, 500)
    return () => clearTimeout(timer)
  }, [userSearch, fetchUsers])

  useEffect(() => {
    const fetchData = async () => {
      const prodRes = await fetch("/api/admin/products?limit=100")
      if (prodRes.ok) {
        const data = await prodRes.json()
        setProducts(data.products || [])
      }
    }
    if (open) fetchData()
  }, [open])

  useEffect(() => {
    if (coupon) {
      setForm({
        code: coupon.code, 
        discountType: coupon.discountType,
        discountValue: coupon.discountValue.toString(),
        minOrder: coupon.minOrder?.toString() || "", 
        usageLimit: coupon.usageLimit?.toString() || "",
        usageLimitPerUser: coupon.usageLimitPerUser?.toString() || "",
        isActive: coupon.isActive,
        expiresAt: coupon.expiresAt ? coupon.expiresAt.split("T")[0] : "",
        productId: coupon.productId || "none",
        targetUserIds: coupon.targetUserIds || []
      })
      setIsSpecificMode(!!coupon.targetUserIds && coupon.targetUserIds.length > 0)
    } else {
      setForm({ code: "", discountType: "percent", discountValue: "", minOrder: "", usageLimit: "", usageLimitPerUser: "", isActive: true, expiresAt: "", productId: "none", targetUserIds: [] })
      setIsSpecificMode(false)
    }
  }, [coupon, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!form.code) newErrors.code = "please provide a unique coupon code"
    if (!form.discountValue) newErrors.discountValue = "please enter a valid discount amount"
    if (!form.usageLimit) newErrors.usageLimit = "please set a global usage limit"
    if (!form.usageLimitPerUser) newErrors.usageLimitPerUser = "please set a per-user limit"
    if (!form.expiresAt) newErrors.expiresAt = "please select a valid expiration date"
    
    // Additional basic numeric validations
    if (form.minOrder && parseFloat(form.minOrder) < 0) newErrors.minOrder = "amount must be 0.00 or higher"
    if (form.usageLimit && parseInt(form.usageLimit) < 0) newErrors.usageLimit = "limit must be 0 or higher"
    if (form.usageLimitPerUser && parseInt(form.usageLimitPerUser) < 0) newErrors.usageLimitPerUser = "limit must be 0 or higher"
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    try {
      const isEdit = !!coupon
      const res = await fetch("/api/admin/coupons", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isEdit ? { id: coupon.id } : {}), ...form }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (err.error?.toLowerCase().includes("already exists")) {
          setErrors({ code: "this coupon code is already in use" })
          return
        }
        throw new Error(err.error)
      }
      toast.success(`Coupon ${isEdit ? "updated" : "created"}`)
      onSave()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save coupon")
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear error for this field as they type
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{coupon ? "Edit Coupon" : "Add Coupon"}</DialogTitle>
          <DialogDescription>{coupon ? "Update coupon details" : "Create a new discount coupon"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Coupon Code *</Label>
            <Input 
              value={form.code} 
              onChange={(e) => updateForm("code", e.target.value.toUpperCase())} 
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              placeholder="SAVE10" 
              className={`font-mono ${errors.code ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
            />
            {errors.code && <p className="text-[10px] font-medium text-red-500 ml-1">{errors.code.toLowerCase()}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount Type *</Label>
              <Select value={form.discountType} onValueChange={(v) => updateForm("discountType", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Discount Value *</Label>
              <Input 
                type="number" 
                min="0" 
                max={form.discountType === 'percent' ? "100" : undefined} 
                value={form.discountValue} 
                onChange={(e) => updateForm("discountValue", e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                className={`h-9 ${errors.discountValue ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {errors.discountValue && <p className="text-[10px] font-medium text-red-500 ml-1">{errors.discountValue.toLowerCase()}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Min Order Amount ($)</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={form.minOrder} 
              onChange={(e) => updateForm("minOrder", e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              className={`h-9 ${errors.minOrder ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
              placeholder="0.00 (Optional)" 
            />
            {errors.minOrder && <p className="text-[10px] font-medium text-red-500 ml-1">{errors.minOrder.toLowerCase()}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Global Usage Limit</Label>
              <Input 
                type="number" 
                value={form.usageLimit} 
                onChange={(e) => updateForm("usageLimit", e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                className={`h-9 ${errors.usageLimit ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
                placeholder="e.g. 100" 
              />
              {errors.usageLimit && <p className="text-[10px] font-medium text-red-500 ml-1">{errors.usageLimit.toLowerCase()}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Limit Per User</Label>
              <Input 
                type="number" 
                value={form.usageLimitPerUser} 
                onChange={(e) => updateForm("usageLimitPerUser", e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                className={`h-9 ${errors.usageLimitPerUser ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
                placeholder="e.g. 1" 
              />
              {errors.usageLimitPerUser && <p className="text-[10px] font-medium text-red-500 ml-1">{errors.usageLimitPerUser.toLowerCase()}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Expires At *</Label>
            <Input 
              type="date" 
              value={form.expiresAt} 
              onChange={(e) => updateForm("expiresAt", e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              className={`rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 transition-all text-xs h-10 ${errors.expiresAt ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.expiresAt && <p className="text-[10px] font-medium text-red-500 ml-1">{errors.expiresAt.toLowerCase()}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Apply To Specific Product (Optional)</Label>
            <Select value={form.productId} onValueChange={(v) => updateForm("productId", v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Products (Storewide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Products (Storewide)</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name.slice(0, 35)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 pt-2">
            <Label>Target Audience</Label>
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-fit">
              <button 
                type="button"
                onClick={() => {
                  setIsSpecificMode(false)
                  updateForm("targetUserIds", [])
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isSpecificMode ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                All Customers
              </button>
              <button 
                type="button"
                onClick={() => setIsSpecificMode(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isSpecificMode ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                Specific Users
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isSpecificMode && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-2 overflow-visible relative"
                >
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      placeholder="Search users by email or name..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      className="pl-9 h-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium text-xs shadow-inner"
                    />
                    {searchingUsers && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-blue-500" />}
                  </div>

                  <AnimatePresence>
                    {userSearchResults.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute z-[60] w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-[180px] overflow-y-auto"
                      >
                        {userSearchResults.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              if (!form.targetUserIds.includes(u.id)) {
                                updateForm("targetUserIds", [...form.targetUserIds, u.id])
                              }
                              setUserSearch("")
                              setUserSearchResults([])
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex flex-col"
                          >
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{u.name || "Unnamed"}</span>
                            <span className="text-[10px] text-zinc-500 font-mono italic">{u.email}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-wrap gap-2">
                    {form.targetUserIds.map(userId => (
                      <Badge key={userId} variant="secondary" className="pl-2 pr-1 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold font-mono">{userId.slice(0, 8)}...</span>
                        <button 
                          type="button" 
                          onClick={() => updateForm("targetUserIds", form.targetUserIds.filter(id => id !== userId))}
                          className="p-0.5 rounded-md hover:bg-red-500 hover:text-white transition-all opacity-40 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={form.isActive} onCheckedChange={(v) => updateForm("isActive", v)} />
            Active
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
              {coupon ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────────────────────────────────────
// Categories Tab
// ───────────────────────────────────────────────────────────

function CategoriesTab({ refreshKey, triggerRefresh }: { refreshKey: number; triggerRefresh: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/categories")
      if (res.ok) setCategories(await res.json())
    } catch {
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories, refreshKey])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? This will fail if there are products assigned to it.")) return
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to delete category")
        return
      }
      toast.success("Category deleted")
      triggerRefresh()
    } catch {
      toast.error("Failed to delete category")
    }
  }

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 min-w-0 sm:max-w-sm w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search categories..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="h-10 pl-9 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-white/40 dark:border-zinc-800/50 shadow-sm focus-visible:ring-blue-500 w-full" 
            />
          </div>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-md shadow-blue-500/20 px-4">
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      <div className="rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 shadow-sm p-6 overflow-hidden mt-4">
        <div className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-zinc-500 py-4 border-b-0">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Slug</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0">Parent ID</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 border-b-0 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRow key={`admin-cat-sk-${i}`} className="border-b-0"><TableCell colSpan={4}><Skeleton className="h-10 rounded-xl" /></TableCell></TableRow>)
                ) : filteredCategories.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-12 text-zinc-400 border-b-0">No categories found</TableCell></TableRow>
                ) : (
                  filteredCategories.map((c) => (
                    <TableRow key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800/30 transition-all border-dashed">
                      <TableCell className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 px-2 py-1 rounded-md">{c.slug}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-zinc-500">{(c as any).parentId || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><MoreHorizontal className="h-4 w-4 text-zinc-500" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-white/40 dark:border-zinc-800/50">
                            <DropdownMenuItem onClick={() => setEditCategory(c)} className="rounded-lg cursor-pointer hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                            <DropdownMenuItem className="text-red-600 rounded-lg cursor-pointer focus:text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <CategoryModal
        open={isCreateOpen || !!editCategory}
        onClose={() => { setIsCreateOpen(false); setEditCategory(null) }}
        category={editCategory}
        allCategories={categories}
        onSave={() => { setIsCreateOpen(false); setEditCategory(null); triggerRefresh() }}
      />
    </div>
  )
}

function CategoryModal({ open, onClose, category, allCategories, onSave }: {
  open: boolean; onClose: () => void; category: Category | null; allCategories: Category[]; onSave: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", slug: "", parentId: "" })

  useEffect(() => {
    if (category) {
      setForm({ name: category.name, slug: category.slug, parentId: (category as any).parentId || "" })
    } else {
      setForm({ name: "", slug: "", parentId: "" })
    }
  }, [category, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required")
      return
    }

    setSaving(true)
    try {
      const isEdit = !!category
      const res = await fetch("/api/admin/categories", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isEdit ? { id: category.id } : {}), ...form }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success(`Category ${isEdit ? "updated" : "created"}`)
      onSave()
    } catch (err: any) {
      toast.error(err.message || "Failed to save category")
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (field: string, value: string | boolean) => setForm({ ...form, [field]: value })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => {
              setForm({ 
                ...form, 
                name: e.target.value,
                slug: form.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
              })
            }} />
          </div>
          <div className="space-y-1.5">
            <Label>Slug *</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Parent Category</Label>
            <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
              <SelectTrigger><SelectValue placeholder="No parent (Root)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (Root)</SelectItem>
                {allCategories.filter(c => c.id !== category?.id).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
              {category ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────────────────────────────────────
// Shared: Order Status Badge
// ───────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
    processing: { label: "Processing", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
    shipped: { label: "Shipped", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400" },
    out_for_delivery: { label: "Out for Delivery", className: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" },
    delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
  }

  const c = config[status] || { label: status, className: "bg-gray-100 text-gray-700" }

  return (
    <Badge variant="secondary" className={`text-xs ${c.className}`}>
      {c.label}
    </Badge>
  )
}

// ───────────────────────────────────────────────────────────
// Security Tab
// ───────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string
  actionType: string
  adminEmail: string
  targetResource: string
  timestamp: string
  ipAddress: string
  details?: string
}

function SecurityTab() {
  const { user } = useAuthStore()
  const logout = useAuthStore((s) => s.logout)
  const setView = useUIStore((s) => s.setView)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [sessionInfo, setSessionInfo] = useState<{
    loginTime: string
    lastActivity: string
    activeSessions: number
  } | null>(null)
  const [inactiveTime, setInactiveTime] = useState(0)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)

  const INACTIVITY_LIMIT_MS = 30 * 60 * 1000 // 30 minutes
  const WARNING_BEFORE_TIMEOUT_MS = 5 * 60 * 1000 // warn 5 min before

  const inactivityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/audit?limit=20")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAuditLogs(data.entries || [])
    } catch {
      toast.error("Failed to load audit log")
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  // Fetch session info
  const fetchSessionInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats")
      if (res.ok) {
        // Use user info for session display
        setSessionInfo({
          loginTime: (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleString() : "Unknown",
          lastActivity: new Date().toLocaleString(),
          activeSessions: 1, // We track single session per user
        })
      }
    } catch {
      // ignore
    }
  }, [user])

  useEffect(() => { fetchAuditLogs() }, [fetchAuditLogs])
  useEffect(() => { fetchSessionInfo() }, [fetchSessionInfo])

  // Inactivity tracking
  useEffect(() => {
    const resetActivity = () => {
      lastActivityRef.current = Date.now()
      setShowTimeoutWarning(false)
    }

    const handleActivity = () => resetActivity()
    window.addEventListener("mousemove", handleActivity)
    window.addEventListener("keydown", handleActivity)
    window.addEventListener("click", handleActivity)
    window.addEventListener("scroll", handleActivity)

    inactivityTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      setInactiveTime(Math.floor(elapsed / 1000))

      if (elapsed >= INACTIVITY_LIMIT_MS - WARNING_BEFORE_TIMEOUT_MS && elapsed < INACTIVITY_LIMIT_MS) {
        setShowTimeoutWarning(true)
      }

      if (elapsed >= INACTIVITY_LIMIT_MS) {
        // Auto-logout
        toast.error("Session expired due to inactivity. Please sign in again.")
        fetch("/api/auth/signout", { method: "POST" }).catch(() => {})
        logout()
        setView({ type: "home" })
      }
    }, 1000)

    return () => {
      window.removeEventListener("mousemove", handleActivity)
      window.removeEventListener("keydown", handleActivity)
      window.removeEventListener("click", handleActivity)
      window.removeEventListener("scroll", handleActivity)
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current)
    }
  }, [logout, setView])

  const formatInactiveTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const remainingTime = Math.max(0, Math.floor((INACTIVITY_LIMIT_MS - inactiveTime * 1000) / 1000))

  const handleLogoutAllOthers = () => {
    toast.success("All other sessions have been terminated (demo)")
    fetchAuditLogs()
  }

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes("LOGIN")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
    if (actionType.includes("DELETE")) return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
    if (actionType.includes("PUT")) return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
    if (actionType.includes("POST")) return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  }

  return (
    <div className="space-y-6">
      {/* Inactivity timeout warning */}
      {showTimeoutWarning && (
        <Alert className="border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            <div className="flex items-center justify-between">
              <span>
                Your session will expire in <strong>{formatInactiveTime(remainingTime)}</strong> due to inactivity.
                Move your mouse or press any key to stay signed in.
              </span>
              <Button
                variant="outline"
                size="sm"
                className="ml-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => { lastActivityRef.current = Date.now(); setShowTimeoutWarning(false) }}
              >
                Stay Signed In
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-blue-600" />
              Session Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Logged in as</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="outline" className="bg-blue-50 text-orange-700 border-blue-200 dark:bg-orange-950/30 dark:text-blue-400 dark:border-orange-900">
                  {user?.role}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Login Time</span>
                <span className="text-sm">{sessionInfo?.loginTime || "Loading..."}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Activity</span>
                <span className="text-sm">{new Date().toLocaleTimeString()}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Sessions</span>
                <Badge variant="secondary">
                  <Activity className="h-3 w-3 mr-1" />
                  {sessionInfo?.activeSessions ?? 1}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Inactive Time</span>
                <span className={`text-sm font-mono ${inactiveTime > 20 * 60 ? "text-red-600 font-semibold" : ""}`}>
                  {formatInactiveTime(inactiveTime)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Session Timeout</span>
                <span className="text-sm">30 min</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={handleLogoutAllOthers}
            >
              <UserX className="h-4 w-4 mr-2" />
              Logout All Other Sessions
            </Button>
          </CardContent>
        </Card>

        {/* Recent Admin Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-600" />
                Recent Admin Activity
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchAuditLogs}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingLogs ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={`admin-analytics-sk-${i}`} className="h-10 w-full" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm">No admin activity recorded yet</p>
                <p className="text-xs mt-1">Actions like creating, updating, or deleting resources will appear here</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[480px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Action</TableHead>
                      <TableHead className="text-xs">Resource</TableHead>
                      <TableHead className="text-xs">Admin</TableHead>
                      <TableHead className="text-xs">IP Address</TableHead>
                      <TableHead className="text-xs">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant="secondary" className={`text-xs ${getActionBadgeColor(entry.actionType)}`}>
                            {entry.actionType.replace("ADMIN_", "")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[200px] truncate">
                          {entry.targetResource}
                        </TableCell>
                        <TableCell className="text-sm">{entry.adminEmail}</TableCell>
                        <TableCell className="text-xs font-mono">{entry.ipAddress}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Policies Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-blue-600" />
            Security Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
              <Shield className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Session Expiry</p>
                <p className="text-xs text-muted-foreground">Admin sessions expire after 7 days</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <Timer className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Inactivity Timeout</p>
                <p className="text-xs text-muted-foreground">Auto-logout after 30 minutes of inactivity</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Brute Force Protection</p>
                <p className="text-xs text-muted-foreground">Max 5 failed login attempts per 15 minutes</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Activity className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Audit Logging</p>
                <p className="text-xs text-muted-foreground">All admin actions are logged with IP addresses</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
