'use client'

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { formatPrice } from "@/lib/types"
import { parseItems } from "@/lib/types"
import type { OrderItemData, ShippingAddress } from "@/lib/types"

// Icons
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, LogOut, Shield, Menu, X,
  Search, Plus, Pencil, Trash2, Eye, ChevronDown, AlertTriangle, TrendingUp,
  DollarSign, BarChart3, RefreshCw, MoreHorizontal, Check, ArrowUpDown, Filter,
  ChevronLeft, ChevronRight, Store, Lock, Timer, UserX, Activity
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

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
  id: string; code: string; discount: number; minOrder: number | null
  maxUses: number | null; usedCount: number; active: boolean
  expiresAt: string | null; createdAt: string
}

type AdminTab = "dashboard" | "products" | "orders" | "users" | "coupons" | "security"

// ───────────────────────────────────────────────────────────
// Sidebar nav items
// ───────────────────────────────────────────────────────────

const navItems: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "users", label: "Users", icon: Users },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "security", label: "Security", icon: Lock },
]

// ───────────────────────────────────────────────────────────
// Admin Panel Component
// ───────────────────────────────────────────────────────────

function SidebarNav({ activeTab, onTabChange, onSignOut }: {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  onSignOut: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-lg leading-tight">Say Shop</h2>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>
      <Separator />
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <Separator />
      <div className="p-3">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors"
        >
          <LogOut className="h-4.5 w-4.5" />
          Sign Out
        </button>
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

  const isAdmin = isAuthenticated && user?.role?.toUpperCase() === "ADMIN"

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
        if (!data.user || data.user.role?.toUpperCase() !== "ADMIN") {
          setAccessDenied(true)
          toast.error("Access denied. Admin privileges required.")
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

  // Loading state — waiting for hydration + server check
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // Access denied — show proper message
  if (accessDenied || !isAdmin) {
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
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setView({ type: "home" })}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-white dark:bg-gray-900 border-r shadow-sm z-30">
        <SidebarNav activeTab={activeTab} onTabChange={handleTabChange} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarNav activeTab={activeTab} onTabChange={handleTabChange} onSignOut={handleSignOut} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted">
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-semibold capitalize">{activeTab}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="font-medium">{user?.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-red-500">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "dashboard" && <DashboardTab />}
              {activeTab === "products" && <ProductsTab />}
              {activeTab === "orders" && <OrdersTab />}
              {activeTab === "users" && <UsersTab />}
              {activeTab === "coupons" && <CouponsTab />}
              {activeTab === "security" && <SecurityTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Dashboard Tab
// ───────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error()
      setStats(await res.json())
    } catch {
      toast.error("Failed to load dashboard stats")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={`admin-stats-sk-${i}`} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: DollarSign, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Total Orders", value: stats.totalOrders.toString(), icon: ShoppingCart, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Total Products", value: stats.totalProducts.toString(), icon: Package, color: "from-orange-500 to-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { label: "Total Users", value: stats.totalUsers.toString(), icon: Users, color: "from-purple-500 to-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
    { label: "Total Coupons", value: stats.totalCoupons.toString(), icon: Tag, color: "from-pink-500 to-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-orange-500" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order #</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No orders yet</TableCell>
                    </TableRow>
                  ) : (
                    stats.recentOrders.map((order: AdminOrder) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.orderNumber.slice(-8)}</TableCell>
                        <TableCell className="text-sm">{order.customerName}</TableCell>
                        <TableCell className="text-sm font-medium">{formatPrice(order.total)}</TableCell>
                        <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-80">
              {stats.lowStockProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  All products are well-stocked
                </div>
              ) : (
                <div className="divide-y">
                  {stats.lowStockProducts.map((p: AdminProduct & { category?: { name: string } }) => (
                    <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category?.name}</p>
                      </div>
                      <Badge variant={p.stock === 0 ? "destructive" : "secondary"} className="ml-2 shrink-0">
                        {p.stock} left
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Products Tab
// ───────────────────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stockEdit, setStockEdit] = useState<{ id: string; stock: number } | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "15" })
      if (search) params.set("search", search)
      if (catFilter) params.set("categoryId", catFilter)
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
  }, [page, search, catFilter])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories")
      if (res.ok) setCategories(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])
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
      fetchProducts()
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
      fetchProducts()
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
      fetchProducts()
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
            <Input placeholder="Search products..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="h-9" />
            <Button size="sm" variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
          </div>
          <Select value={catFilter} onValueChange={(v) => { setCatFilter(v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Price</TableHead>
                  <TableHead className="text-xs">Stock</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRow key={`admin-prod-sk-${i}`}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>)
                ) : products.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                            {p.name.charAt(0)}
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
                            <Input type="number" value={stockEdit.stock} onChange={(e) => setStockEdit({ ...stockEdit, stock: parseInt(e.target.value) || 0 })} className="w-16 h-7 text-xs" />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveStock(p.id, stockEdit.stock)}>
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setStockEdit(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <button onClick={() => setStockEdit({ id: p.id, stock: p.stock })} className="text-sm hover:text-orange-500 transition-colors cursor-pointer">
                            {p.stock}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "default" : "secondary"} className={p.active ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                          {p.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditProduct(p)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(p)}>
                              {p.active ? <X className="h-3.5 w-3.5 mr-2" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                              {p.active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} products</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm flex items-center px-3">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Create / Edit Product Modal */}
      <ProductModal
        open={isCreateOpen || !!editProduct}
        onClose={() => { setIsCreateOpen(false); setEditProduct(null) }}
        product={editProduct}
        categories={categories}
        onSave={() => { setIsCreateOpen(false); setEditProduct(null); fetchProducts() }}
      />
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
        throw new Error(err.error)
      }
      toast.success(`Product ${isEdit ? "updated" : "created"}`)
      onSave()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save product")
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (field: string, value: string | boolean) => setForm({ ...form, [field]: value })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>{product ? "Update product details" : "Create a new product"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>Price *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => updateForm("price", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Compare Price</Label>
              <Input type="number" step="0.01" value={form.comparePrice} onChange={(e) => updateForm("comparePrice", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(e) => updateForm("stock", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={(e) => updateForm("tags", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Input value={form.shortDesc} onChange={(e) => updateForm("shortDesc", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={3} />
          </div>
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
            <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
              {product ? "Update" : "Create"}
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

function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [viewOrder, setViewOrder] = useState<AdminOrder | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "15" })
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

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success("Order status updated")
      fetchOrders()
      if (viewOrder?.id === orderId) {
        const updated = await res.json()
        setViewOrder({ ...viewOrder, status: updated.status })
      }
    } catch {
      toast.error("Failed to update order status")
    }
  }

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const totalPages = Math.ceil(total / 15)

  const statuses = ["pending", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="flex gap-2 flex-1 min-w-0 sm:max-w-sm">
            <Input placeholder="Search orders..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="h-9" />
            <Button size="sm" variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Order #</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Total</TableHead>
                  <TableHead className="text-xs">Payment</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRow key={`admin-order-sk-${i}`}><TableCell colSpan={7}><Skeleton className="h-10" /></TableCell></TableRow>)
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <button onClick={() => setViewOrder(o)} className="font-mono text-xs text-orange-500 hover:underline cursor-pointer">
                          {o.orderNumber.slice(-8)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{o.customerName}</p>
                        <p className="text-xs text-muted-foreground">{o.customerEmail}</p>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{formatPrice(o.total)}</TableCell>
                      <TableCell className="text-xs capitalize">{o.paymentMethod.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <Select value={o.status} onValueChange={(v) => handleStatusUpdate(o.id, v)}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <OrderStatusBadge status={o.status} />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewOrder(o)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} orders</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm flex items-center px-3">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
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
                  <p className="text-sm capitalize">{viewOrder.paymentMethod.replace(/_/g, " ")}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Shipping Address</p>
                {(() => {
                  const addr = (() => { try { return JSON.parse(viewOrder.shippingAddress) } catch { return null } })() as ShippingAddress | null
                  return addr ? (
                    <p className="text-sm">{addr.address}, {addr.city}, {addr.state} {addr.zipCode}</p>
                  ) : (
                    <p className="text-sm">{viewOrder.shippingAddress}</p>
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

function UsersTab() {
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
      const params = new URLSearchParams({ page: page.toString(), limit: "15" })
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

  useEffect(() => { fetchUsers() }, [fetchUsers])

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
      fetchUsers()
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
        <div className="flex gap-2 flex-1 min-w-0 sm:max-w-sm">
          <Input placeholder="Search users..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="h-9" />
          <Button size="sm" variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Joined</TableHead>
                  <TableHead className="text-xs">Session</TableHead>
                  <TableHead className="text-xs w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRow key={`admin-user-sk-${i}`}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>)
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{u.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "ADMIN" ? "default" : "secondary"} className={u.role === "ADMIN" ? "bg-orange-500 hover:bg-orange-600" : ""}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={u.sessionToken ? "default" : "outline"} className={u.sessionToken ? "bg-emerald-500 hover:bg-emerald-600 text-xs" : "text-xs"}>
                          {u.sessionToken ? "Active" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setConfirmRoleChange({ userId: u.id, userName: u.name, newRole: u.role === "ADMIN" ? "CUSTOMER" : "ADMIN" })}>
                              <Shield className="h-3.5 w-3.5 mr-2" />
                              {u.role === "ADMIN" ? "Remove Admin" : "Make Admin"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} users</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm flex items-center px-3">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
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
            <Button variant={confirmRoleChange?.newRole === "ADMIN" ? "default" : "destructive"} onClick={handleRoleChange} className={confirmRoleChange?.newRole === "ADMIN" ? "bg-orange-500 hover:bg-orange-600" : ""}>
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

function CouponsTab() {
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
      const params = new URLSearchParams({ page: page.toString(), limit: "20" })
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

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  const handleToggleActive = async (coupon: AdminCoupon) => {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, active: !coupon.active }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Coupon ${!coupon.active ? "activated" : "deactivated"}`)
      fetchCoupons()
    } catch {
      toast.error("Failed to update coupon")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Coupon deleted")
      fetchCoupons()
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
        <div className="flex gap-2 flex-1 min-w-0 sm:max-w-sm">
          <Input placeholder="Search coupons..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="h-9" />
          <Button size="sm" variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-1" /> Add Coupon
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Discount</TableHead>
                  <TableHead className="text-xs">Min Order</TableHead>
                  <TableHead className="text-xs">Usage</TableHead>
                  <TableHead className="text-xs">Expires</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRow key={`admin-coupon-sk-${i}`}><TableCell colSpan={7}><Skeleton className="h-10" /></TableCell></TableRow>)
                ) : coupons.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No coupons found</TableCell></TableRow>
                ) : (
                  coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-sm border-dashed">{c.code}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-orange-600">{c.discount}%</TableCell>
                      <TableCell className="text-sm">{c.minOrder ? formatPrice(c.minOrder) : "No minimum"}</TableCell>
                      <TableCell className="text-sm">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.active ? "default" : "secondary"} className={c.active ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                          {c.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditCoupon(c)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(c)}>
                              {c.active ? <X className="h-3.5 w-3.5 mr-2" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                              {c.active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} coupons</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm flex items-center px-3">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      <CouponModal
        open={isCreateOpen || !!editCoupon}
        onClose={() => { setIsCreateOpen(false); setEditCoupon(null) }}
        coupon={editCoupon}
        onSave={() => { setIsCreateOpen(false); setEditCoupon(null); fetchCoupons() }}
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
    code: "", discount: "", minOrder: "", maxUses: "", active: true,
    expiresAt: "",
  })

  useEffect(() => {
    if (coupon) {
      setForm({
        code: coupon.code, discount: coupon.discount.toString(),
        minOrder: coupon.minOrder?.toString() || "", maxUses: coupon.maxUses?.toString() || "",
        active: coupon.active,
        expiresAt: coupon.expiresAt ? coupon.expiresAt.split("T")[0] : "",
      })
    } else {
      setForm({ code: "", discount: "", minOrder: "", maxUses: "", active: true, expiresAt: "" })
    }
  }, [coupon, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || !form.discount) {
      toast.error("Code and discount are required")
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

  const updateForm = (field: string, value: string | boolean) => setForm({ ...form, [field]: value })

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
            <Input value={form.code} onChange={(e) => updateForm("code", e.target.value.toUpperCase())} placeholder="SAVE10" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Discount (%) *</Label>
            <Input type="number" min="1" max="100" value={form.discount} onChange={(e) => updateForm("discount", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Min Order ($)</Label>
              <Input type="number" step="0.01" value={form.minOrder} onChange={(e) => updateForm("minOrder", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Uses</Label>
              <Input type="number" value={form.maxUses} onChange={(e) => updateForm("maxUses", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Expires At</Label>
            <Input type="date" value={form.expiresAt} onChange={(e) => updateForm("expiresAt", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={form.active} onCheckedChange={(v) => updateForm("active", v)} />
            Active
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
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
          loginTime: user?.createdAt ? new Date(user.createdAt).toLocaleString() : "Unknown",
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
              <Shield className="h-4 w-4 text-orange-500" />
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
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900">
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
                <Activity className="h-4 w-4 text-orange-500" />
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
            <Lock className="h-4 w-4 text-orange-500" />
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
