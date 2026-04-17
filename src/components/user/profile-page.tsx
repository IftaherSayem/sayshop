import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatPrice, parseItems, type OrderItemData } from "@/lib/types"
import { calculateTierProgress } from "@/lib/dashboard-utils"
import { REWARDS_CONFIG } from "@/lib/rewards"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  User,
  Plus,
  Trash2,
  Lock,
  Loader2,
  Camera,
  Save,
  ShoppingCart,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────
type ProfileTab = "overview" | "profile" | "addresses" | "payments" | "settings"

interface Address {
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

// ── Animation Variants ─────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
}

export function ProfilePage() {
  const setView = useUIStore((s) => s.setView)
  const currentView = useUIStore((s) => s.currentView)
  const { user, isAuthenticated, setUser } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const hydrated = useAuthStore((s) => s._hydrated)

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [orderCount, setOrderCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Profile Form State
  const [profileData, setProfileData] = useState({
    fullName: user?.name || "",
    phone: "",
    avatar: "",
    points: 0,
    loyaltyTier: "Bronze",
    twoFactorEnabled: false
  })

  const [initialProfileData, setInitialProfileData] = useState({
    fullName: user?.name || "",
    phone: "",
    avatar: "",
    points: 0,
    loyaltyTier: "Bronze",
    twoFactorEnabled: false
  })

  const [errors, setErrors] = useState({
    fullName: "",
    phone: "",
  })

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([])

  // Dashboard Data State
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [rewardsHistory, setRewardsHistory] = useState<any[]>([])
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [perksModalOpen, setPerksModalOpen] = useState(false)

  // Sync URL with User ID if missing
  useEffect(() => {
    if (isAuthenticated && user?.id && currentView.type === "profile" && !currentView.id) {
      setView({ ...currentView, id: user.id })
    }
  }, [isAuthenticated, user?.id, currentView, setView])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      setView({ type: 'auth' })
    }
  }, [hydrated, isAuthenticated, setView])

  // Fetch Full Profile Data (including hidden fields like address JSON)
  useEffect(() => {
    setMounted(true)
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile")
        if (res.ok) {
          const data = await res.json()
          const fetchedProfile = {
            fullName: data.user.name,
            phone: data.user.phone || "",
            avatar: data.user.avatar || "",
            points: data.user.points || 0,
            loyaltyTier: data.user.loyaltyTier || "Bronze",
            twoFactorEnabled: data.user.twoFactorEnabled || false,
          }
          setProfileData(fetchedProfile)
          setInitialProfileData(fetchedProfile)
          
          // Parse addresses from JSON
          const savedAddresses = data.user.address?.addresses || []
          setAddresses(savedAddresses)
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err)
      }
    }

    const fetchOrders = async () => {
      setLoadingDashboard(true)
      try {
        const res = await fetch("/api/orders?limit=10")
        const data = await res.json()
        if (Array.isArray(data.orders)) {
          setOrderCount(data.total || data.orders.length)
          setRecentOrders(data.orders.slice(0, 3))
        }
      } catch { /* ignore */ } finally {
        setLoadingDashboard(false)
      }
    }

    const fetchRewards = async () => {
      try {
        const res = await fetch("/api/user/rewards/history") // Attempting to fetch real history
        if (res.ok) {
          const data = await res.json()
          setRewardsHistory(data.history || [])
        } else {
           // Fallback to empty if table doesn't exist yet
           setRewardsHistory([])
        }
      } catch { /* ignore */ }
    }

    if (isAuthenticated) {
      fetchProfile()
      fetchOrders()
      fetchRewards()
    }
  }, [isAuthenticated])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    setLoading(true)
    const toastId = toast.loading("Uploading avatar...")
    
    try {
      const { createSupabaseBrowserClient } = await import("@/lib/supabase/client")
      const supabase = createSupabaseBrowserClient()
      
      const fileExt = file.name.split(".").pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(filePath)

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profileData.fullName,
          phone: profileData.phone,
          avatar: publicUrl,
        })
      })

      if (!res.ok) throw new Error()
      
      const data = await res.json()
      const updatedProfile = { ...profileData, avatar: publicUrl, points: profileData.points || 0 }
      setProfileData(updatedProfile)
      setInitialProfileData(updatedProfile)
      setUser({ ...user!, name: data.profile.fullName })
      
      toast.success("Avatar updated successfully", { id: toastId })
    } catch (err: any) {
      console.error("Upload failed:", err)
      toast.error(`Upload failed: ${err.message || "Unknown error"}`, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const nextErrors = { fullName: "", phone: "" }
    let hasError = false

    if (!profileData.fullName.trim()) {
      nextErrors.fullName = "Full name is required"
      hasError = true
    } else if (profileData.fullName.trim().length < 2) {
      nextErrors.fullName = "Name is too short"
      hasError = true
    }

    if (profileData.phone.trim() && !/^\+?[0-9\s-]{7,20}$/.test(profileData.phone.trim())) {
      nextErrors.phone = "Invalid phone number format"
      hasError = true
    }

    setErrors(nextErrors)
    if (hasError) return

    setSaving(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profileData.fullName.trim(),
          phone: profileData.phone.trim(),
          avatar: profileData.avatar,
        })
      })

      if (!res.ok) throw new Error()
      
      const data = await res.json()
      // Sync initial state to disable button again
      const savedProfile = { 
        fullName: data.profile.fullName, 
        phone: data.profile.phone || "",
        avatar: data.profile.avatar || "",
        points: profileData.points, 
        loyaltyTier: profileData.loyaltyTier,
        twoFactorEnabled: data.profile.twoFactorEnabled ?? profileData.twoFactorEnabled
      }
      setProfileData(savedProfile)
      setInitialProfileData(savedProfile)
      
      // Sync auth store
      setUser({
        ...user!,
        name: data.profile.fullName,
      })
      toast.success("Profile changes saved!")
    } catch (err) {
      console.error("Save error:", err)
      toast.error("Could not save profile changes")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAddresses = async (newAddresses: Address[]) => {
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profileData.fullName,
          phone: profileData.phone,
          avatar: profileData.avatar,
          address: { addresses: newAddresses }
        })
      })
      setAddresses(newAddresses)
    } catch {
      toast.error("Failed to save addresses")
    }
  }

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    fullName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
    phone: "",
    isDefault: false
  })

  const openAddAddress = () => {
    setEditingAddress(null)
    setAddressForm({
      label: "Home",
      fullName: profileData.fullName,
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      phone: profileData.phone,
      isDefault: addresses.length === 0
    })
    setAddressModalOpen(true)
  }

  const openEditAddress = (addr: Address) => {
    setEditingAddress(addr)
    setAddressForm({ ...addr })
    setAddressModalOpen(true)
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    let updatedAddresses: Address[]
    if (editingAddress) {
      updatedAddresses = addresses.map(a => 
        a.id === editingAddress.id ? { ...addressForm, id: a.id } : (addressForm.isDefault ? { ...a, isDefault: false } : a)
      )
    } else {
      const newAddress = { ...addressForm, id: Math.random().toString(36).substr(2, 9) }
      updatedAddresses = addressForm.isDefault 
        ? [...addresses.map(a => ({ ...a, isDefault: false })), newAddress]
        : [...addresses, newAddress]
    }

    try {
      await handleSaveAddresses(updatedAddresses)
      setAddressModalOpen(false)
      toast.success(editingAddress ? "Address updated" : "Address added")
    } catch {
      toast.error("Failed to save address")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter(a => a.id !== id)
    // If we deleted the default, set first one as default
    if (updated.length > 0 && !updated.some(a => a.isDefault)) {
      updated[0].isDefault = true
    }
    handleSaveAddresses(updated)
    toast.success("Address deleted")
  }

  const initials = profileData.fullName
    ? profileData.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.name?.slice(0, 2).toUpperCase() || "SS"

  if (!mounted || !hydrated) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Address Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {addressModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{editingAddress ? "Edit Address" : "Add New Address"}</h3>
                  <p className="text-xs text-zinc-500">Provide your shipping details below.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setAddressModalOpen(false)}>×</Button>
              </div>
              <form onSubmit={handleAddressSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Label (e.g. Home, Work)</Label>
                    <Input value={addressForm.label} onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={addressForm.fullName} onChange={e => setAddressForm(f => ({ ...f, fullName: e.target.value }))} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Street Address</Label>
                  <Input value={addressForm.address} onChange={e => setAddressForm(f => ({ ...f, address: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State / Province</Label>
                    <Input value={addressForm.state} onChange={e => setAddressForm(f => ({ ...f, state: e.target.value }))} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Zip / Postal Code</Label>
                    <Input value={addressForm.zipCode} onChange={e => setAddressForm(f => ({ ...f, zipCode: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Input value={addressForm.country} onChange={e => setAddressForm(f => ({ ...f, country: e.target.value }))} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                    <Label>Phone Number</Label>
                    <Input value={addressForm.phone} onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))} required />
                  </div>
                <div className="flex items-center gap-3 pt-2">
                  <Switch checked={addressForm.isDefault} onCheckedChange={c => setAddressForm(f => ({ ...f, isDefault: c }))} />
                  <Label>Set as default shipping address</Label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setAddressModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-blue-700 hover:bg-orange-700" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {editingAddress ? "Update" : "Save"} Address
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Tier Perks Modal ────────────────────────────────── */}
      <AnimatePresence>
        {perksModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 dark:border-zinc-800"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight uppercase">Tier Multiplier Perks</h3>
                    <p className="text-sm text-zinc-500 font-medium">Earn more as you climb the ranks.</p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setPerksModalOpen(false)}>×</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { tier: 'Bronze', pts: '1x Points', perk: 'Base earning rate', color: 'bg-blue-50 text-blue-600', icon: Activity },
                    { tier: 'Silver', pts: '1.2x Points', perk: 'Reach 2,500 pts', color: 'bg-zinc-100 text-zinc-700', icon: GitCompareArrows },
                    { tier: 'Gold', pts: '1.5x Points', perk: 'Reach 10,000 pts', color: 'bg-amber-100 text-amber-600', icon: Star },
                  ].map((p, i) => (
                    <div key={i} className={`p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all hover:shadow-lg ${profileData.loyaltyTier === p.tier ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-zinc-900 shadow-xl' : ''}`}>
                      <div className={`h-10 w-10 rounded-xl ${p.color} flex items-center justify-center mb-4`}>
                        <p.icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-black uppercase text-xs tracking-widest mb-1">{p.tier}</h4>
                      <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 leading-none mb-1">{p.pts}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{p.perk}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 dark:bg-zinc-800/50 p-6 rounded-2xl">
                  <h4 className="font-bold text-sm mb-3">Additional Membership Benefits:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Early access to seasonal collection drops
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Exclusive birthday reward vouchers
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Free premium gift wrapping on Gold orders
                    </li>
                  </ul>
                </div>

                <Button className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 h-14 rounded-2xl font-bold" onClick={() => setPerksModalOpen(false)}>
                  Close Perks Details
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-900 dark:text-zinc-100">Welcome Back!</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manage your account preferences and track your activity.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setView({ type: "home" })}>
          Shop More Products
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* ── Left Sidebar: Profile Summary ────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="overflow-hidden border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900">
            <div className="h-24 bg-gradient-to-r from-blue-400 to-blue-700" />
            <CardContent className="-mt-12 text-center pb-8 px-6">
              <div className="relative inline-block mb-4">
                <Avatar className="h-24 w-24 ring-4 ring-white dark:ring-zinc-900 shadow-2xl">
                  <AvatarImage src={profileData.avatar} />
                  <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-2xl font-bold text-blue-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-700 text-white shadow-lg hover:bg-orange-700 transition-colors cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={loading}
                  />
                </label>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{profileData.fullName || user?.name}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
              
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Badge variant="outline" className={`border-none ${
                    profileData.loyaltyTier === 'Gold' ? 'bg-amber-100 text-amber-700' :
                    profileData.loyaltyTier === 'Silver' ? 'bg-zinc-100 text-zinc-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                  {profileData.loyaltyTier} Member
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20">
                  Verified Account
                </Badge>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{orderCount}</p>
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Orders</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{addresses.length}</p>
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Places</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-blue-600">{profileData.points}</p>
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Points</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Tabs (Mobile style list on desktop) */}
          <Card className="border-none shadow-lg shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 p-2">
            <div className="space-y-1">
              {[
                { id: "overview", icon: Activity, label: "Overview" },
                { id: "profile", icon: User, label: "Edit Profile" },
                { id: "addresses", icon: MapPin, label: "Shipping Addresses" },
                { id: "payments", icon: CreditCard, label: "Payment Methods" },
                { id: "settings", icon: Settings, label: "Account Settings" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ProfileTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id 
                    ? "bg-blue-50 text-blue-700 dark:bg-indigo-950/30" 
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.id && <motion.div layoutId="activeTab" className="ml-auto w-1 h-4 bg-blue-700 rounded-full" />}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right Content: Dynamic View ──────────────────────── */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Quick Actions & Dashboard Stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Loyalty Tier Progress */}
                    {(() => {
                      const tierProgress = calculateTierProgress(profileData.points)
                      return (
                        <Card className="lg:col-span-2 relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 text-white">
                          <CardContent className="p-6 sm:p-8">
                            <div className="flex justify-between items-start mb-6">
                              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                <Star className="h-7 w-7 text-yellow-300" />
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-blue-100/70 tracking-widest">Current Balance</p>
                                <p className="text-3xl font-black tracking-tight">{profileData.points} PTS</p>
                              </div>
                            </div>
                            
                            <div className="space-y-3 mb-8">
                              <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                                <span className={tierProgress.currentTier === 'Gold' ? 'text-yellow-300' : 'text-blue-100'}>{tierProgress.currentTier} TIER</span>
                                {tierProgress.nextTier && <span className="text-blue-100/40">{tierProgress.nextTier} TIER</span>}
                              </div>
                              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${tierProgress.percentComplete}%` }}
                                  transition={{ duration: 1.2, ease: "easeOut" }}
                                  className={`h-full bg-gradient-to-r from-yellow-300 to-amber-300 rounded-full shadow-[0_0_15px_rgba(253,224,71,0.4)]`}
                                />
                              </div>
                              {tierProgress.nextTier && (
                                <p className="text-xs text-blue-100/70 font-medium">
                                  You're <span className="text-yellow-300 font-bold">{tierProgress.pointsToNext} points</span> away from becoming a {tierProgress.nextTier} member!
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                              <Button 
                                onClick={() => setView({ type: 'home' })}
                                className="flex-1 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm h-11 rounded-xl shadow-lg shadow-blue-900/20"
                              >
                                Browse Rewards Shop
                              </Button>
                              <Button 
                                onClick={() => setPerksModalOpen(true)}
                                className="flex-1 bg-white/10 border-white/20 hover:bg-white text-white hover:text-blue-700 font-bold text-sm h-11 rounded-xl transition-all duration-300 border"
                              >
                                Tier Benefits
                              </Button>
                            </div>
                          </CardContent>
                          {/* Decorative pattern */}
                          <div className="absolute -right-12 -bottom-12 opacity-10 rotate-12">
                            <Star className="h-48 w-48" />
                          </div>
                        </Card>
                      )
                    })()}

                    {/* Quick Actions Sidebar */}
                    <div className="space-y-4">
                      <Card className="bg-white dark:bg-zinc-900 shadow-xl border border-zinc-100 dark:border-zinc-800 h-full">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-black uppercase tracking-wider text-zinc-400">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setView({ type: 'orders' })}
                            className="w-full justify-start gap-3 h-12 border-zinc-100 dark:border-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-200 transition-all font-bold text-xs"
                          >
                            <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                               <Package className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            Track Last Order
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setView({ type: 'home' })}
                            className="w-full justify-start gap-3 h-12 border-zinc-100 dark:border-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 transition-all font-bold text-xs"
                          >
                            <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                               <ShoppingCart className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            Continue Shopping
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start gap-3 h-12 border-zinc-100 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-200 transition-all font-bold text-xs"
                          >
                            <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                               <Heart className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            My Wishlist
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Recent Activity & Orders */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Orders Snapshot */}
                    <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle className="text-lg">Recent Orders</CardTitle>
                          <CardDescription>Your latest purchases at a glance.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setView({ type: "orders" })} className="text-blue-700 font-bold text-xs uppercase tracking-wider">
                          All
                        </Button>
                      </CardHeader>
                      <CardContent className="px-0">
                        {loadingDashboard ? (
                          <div className="p-4 space-y-4">
                            {[1,2].map(i => <div key={i} className="h-16 bg-zinc-50 dark:bg-zinc-800 rounded-xl animate-pulse" />)}
                          </div>
                        ) : recentOrders.length > 0 ? (
                          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                             {recentOrders.map((order) => {
                               const firstItem = parseItems<OrderItemData>(order.items)[0]
                               const status = (order.status as string).toLowerCase()
                               return (
                                 <div key={order.id} className="flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                   <div className="h-12 w-12 rounded-lg border bg-zinc-50 dark:bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                                      {firstItem?.image ? (
                                        <img src={firstItem.image} className="h-full w-full object-cover" alt="" />
                                      ) : (
                                        <Package className="h-5 w-5 text-zinc-300" />
                                      )}
                                   </div>
                                   <div className="min-w-0 flex-1">
                                      <p className="text-sm font-bold truncate">{order.orderNumber}</p>
                                      <p className="text-[10px] text-zinc-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                                   </div>
                                   <div className="text-right shrink-0">
                                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{formatPrice(order.total)}</p>
                                      <Badge variant="outline" className={`text-[9px] uppercase font-bold h-4 px-1 ${
                                        status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                        status === 'shipped' || status === 'out_for_delivery' ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' :
                                        'bg-zinc-50 text-zinc-500 border-zinc-200'
                                      }`}>
                                        {status.replace(/_/g, ' ')}
                                      </Badge>
                                   </div>
                                 </div>
                               )
                             })}
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="h-12 w-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                              <ShoppingCart className="h-6 w-6 text-zinc-300" />
                            </div>
                            <p className="text-sm font-medium text-zinc-500">No orders yet</p>
                            <Button variant="link" onClick={() => setView({ type: 'home' })} className="text-blue-700 text-xs mt-1">Start Shopping</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Live Activity Feed */}
                    <Card className="border-none shadow-xl bg-white dark:bg-zinc-900">
                      <CardHeader>
                        <CardTitle className="text-lg">Live Activity Feed</CardTitle>
                        <CardDescription>Real-time updates on your account.</CardDescription>
                      </CardHeader>
                      <CardContent>
                         <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-zinc-100 dark:before:bg-zinc-800">
                           {(() => {
                             // Merge Reward History + Best Order Status Events
                             const historyEvents = rewardsHistory.map(h => ({
                               type: h.points > 0 ? 'EARN' : 'REDEEM',
                               title: h.points > 0 ? 'Points Earned' : 'Points Redeemed',
                               desc: h.reason,
                               date: new Date(h.created_at),
                               points: h.points,
                               id: `h-${h.id}`
                             }))

                             const orderEvents = recentOrders.slice(0, 1).flatMap(o => {
                               const status = o.status.toLowerCase()
                               const events = [{
                                 type: 'ORDER_PLACED',
                                 title: 'Order Confirmed',
                                 desc: `Order ${o.orderNumber} has been received.`,
                                 date: new Date(o.createdAt),
                                 id: `o-p-${o.id}`
                               }]

                               if (status === 'shipped' || status === 'delivered') {
                                 events.unshift({
                                   type: 'ORDER_SHIPPED',
                                   title: 'Package Shipped',
                                   desc: `Order ${o.orderNumber} is on its way to you.`,
                                   date: new Date(new Date(o.createdAt).getTime() + 3600000), // Simulated update
                                   id: `o-s-${o.id}`
                                 })
                               }

                               if (status === 'delivered') {
                                 events.unshift({
                                   type: 'ORDER_DELIVERED',
                                   title: 'Order Delivered',
                                   desc: `Parcel for ${o.orderNumber} was dropped off.`,
                                   date: new Date(new Date(o.createdAt).getTime() + 7200000), // Simulated update
                                   id: `o-d-${o.id}`
                                 })
                               }
                               return events
                             })

                             const allEvents = [...historyEvents, ...orderEvents]
                               .sort((a, b) => b.date.getTime() - a.date.getTime())
                               .slice(0, 5)

                             if (allEvents.length === 0) {
                               return (
                                 <div className="flex flex-col items-center justify-center text-center py-6">
                                   <Bell className="h-10 w-10 text-zinc-200 mb-2" />
                                   <p className="text-sm font-medium text-zinc-400">Waiting for activity...</p>
                                 </div>
                               )
                             }

                             return allEvents.map((item, idx) => {
                               let icon = <Activity className="h-5 w-5" />
                               let color = "bg-blue-50 text-blue-600"
                               
                               if (item.type === 'EARN') {
                                 icon = <Star className="h-5 w-5" />
                                 color = "bg-emerald-50 text-emerald-600"
                               } else if (item.type === 'REDEEM') {
                                 icon = <Clock className="h-5 w-5" />
                                 color = "bg-blue-50 text-blue-600"
                               } else if (item.type === 'ORDER_DELIVERED') {
                                 icon = <CheckCircle className="h-5 w-5" />
                                 color = "bg-purple-100 text-purple-600"
                               } else if (item.type === 'ORDER_SHIPPED') {
                                 icon = <Package className="h-5 w-5" />
                                 color = "bg-blue-100 text-blue-600"
                               }

                               return (
                                 <div key={item.id} className="relative flex gap-4">
                                   <div className={`h-10 w-10 flex items-center justify-center rounded-full ring-4 ring-white dark:ring-zinc-900 shrink-0 z-10 ${color}`}>
                                     {icon}
                                   </div>
                                   <div className={idx !== allEvents.length - 1 ? "pb-6" : ""}>
                                     <p className="text-sm font-bold">{item.title}</p>
                                     <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                                     <p className="text-[10px] text-zinc-400 font-bold mt-1.5 uppercase tracking-wider">
                                       {(item as any).points ? `${(item as any).points > 0 ? '+' : ''}${(item as any).points} PTS • ` : ''}
                                       {item.date.toLocaleDateString()}
                                     </p>
                                   </div>
                                 </div>
                               )
                             })
                           })()}
                         </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                <Card className="border-none shadow-lg bg-white dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle>Edit Profile Information</CardTitle>
                    <CardDescription>Keep your personal details up to date.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="fullName" className={errors.fullName ? "text-red-500" : ""}>Full Name</Label>
                          <Input 
                            id="fullName" 
                            value={profileData.fullName} 
                            onChange={(e) => {
                              setProfileData(p => ({ ...p, fullName: e.target.value }))
                              if (errors.fullName) setErrors(prev => ({ ...prev, fullName: "" }))
                            }}
                            className={errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}
                            placeholder="John Doe" 
                          />
                          {errors.fullName && <p className="text-[10px] text-red-500 font-medium">{errors.fullName}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address (Read-only)</Label>
                          <Input id="email" value={user?.email} disabled className="bg-zinc-50 dark:bg-zinc-800" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className={errors.phone ? "text-red-500" : ""}>Phone Number</Label>
                          <Input 
                            id="phone" 
                            value={profileData.phone} 
                            onChange={(e) => {
                              setProfileData(p => ({ ...p, phone: e.target.value }))
                              if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }))
                            }}
                            className={errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                            placeholder="+1 (555) 000-0000" 
                          />
                          {errors.phone && <p className="text-[10px] text-red-500 font-medium">{errors.phone}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Profile Picture</Label>
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border">
                              <AvatarImage src={profileData.avatar} />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <label
                                htmlFor="avatar-upload-main"
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer gap-2"
                              >
                                <Camera className="h-4 w-4" />
                                {loading ? "Uploading..." : "Change Photo"}
                                <input
                                  id="avatar-upload-main"
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleAvatarUpload}
                                  disabled={loading}
                                />
                              </label>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                JPG, PNG or GIF. Max 5MB.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button 
                          type="submit" 
                          disabled={saving || (profileData.fullName === initialProfileData.fullName && profileData.phone === initialProfileData.phone)} 
                          className="px-8 bg-blue-700 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          Save Profile Changes
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {activeTab === "addresses" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">My Saved Addresses</h3>
                    <Button variant="outline" className="gap-2" onClick={openAddAddress}>
                      <Plus className="h-4 w-4" /> Add New
                    </Button>
                  </div>
                  {addresses.length === 0 ? (
                    <Card className="border-dashed border-2 py-12 flex flex-col items-center justify-center text-center">
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-full mb-4">
                        <MapPin className="h-8 w-8 text-zinc-300" />
                      </div>
                      <p className="text-zinc-500 font-medium">No addresses saved yet</p>
                      <Button variant="link" onClick={openAddAddress} className="mt-2 text-blue-700">Add your first shipping location</Button>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {addresses.map((address) => (
                        <Card key={address.id} className="relative group overflow-hidden hover:shadow-md transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{address.label}</Badge>
                              {address.isDefault && <Badge className="bg-emerald-500 text-white border-none">Default</Badge>}
                            </div>
                            <h4 className="font-bold mb-1">{address.fullName}</h4>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{address.address}</p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{address.city}, {address.state} {address.zipCode}</p>
                            <div className="mt-4 flex gap-2 pt-3 border-t">
                              <Button variant="ghost" size="sm" onClick={() => openEditAddress(address)} className="h-8 text-xs gap-1.5"><Edit className="h-3 w-3" /> Edit</Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteAddress(address.id)}
                                className="h-8 text-xs gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "payments" && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold">Saved Payment Methods</h3>
                  <Card className="border-none bg-gradient-to-br from-zinc-800 to-zinc-950 text-white overflow-hidden max-w-sm">
                    <CardContent className="p-6 relative">
                      <div className="flex justify-between items-start mb-12">
                        <div className="h-10 w-12 bg-white/10 rounded flex items-center justify-center backdrop-blur-md">
                          <CreditCard className="h-6 w-6 text-blue-400" />
                        </div>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" className="h-3 opacity-80 filter brightness-0 invert" alt="Visa" />
                      </div>
                      <p className="text-xl tracking-[0.2em] font-mono mb-4">•••• •••• •••• 4242</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] uppercase text-zinc-500 font-bold mb-0.5">Card Holder</p>
                          <p className="text-sm font-medium">{profileData.fullName || user?.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-zinc-500 font-bold mb-0.5">Expires</p>
                          <p className="text-sm font-medium">12/28</p>
                        </div>
                      </div>
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    </CardContent>
                  </Card>
                  <Button variant="outline" className="gap-2 w-full max-w-sm sm:w-auto" onClick={() => toast.info("Payment addition coming soon!")}>
                    <Plus className="h-4 w-4" /> Add New Card
                  </Button>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold">Account Preferences</h3>
                  
                  <Card className="border-none shadow-lg bg-white dark:bg-zinc-900 overflow-hidden">
                    <CardContent className="p-0 flex flex-col">
                      <div className="flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center">
                            <Moon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-bold">Dark Mode Appearance</h4>
                            <p className="text-xs text-zinc-500">Toggle website look and feel.</p>
                          </div>
                        </div>
                        <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-blue-100 dark:bg-orange-950/30 rounded-full flex items-center justify-center">
                            <Bell className="h-5 w-5 text-blue-700" />
                          </div>
                          <div>
                            <h4 className="font-bold">Push Notifications</h4>
                            <p className="text-xs text-zinc-500">Alerts on order status changes.</p>
                          </div>
                        </div>
                        <Switch defaultChecked onCheckedChange={(checked) => toast.success(checked ? "Notifications enabled" : "Notifications disabled")} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center">
                            <Lock className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <h4 className="font-bold">Two-Factor Auth</h4>
                            <p className="text-xs text-zinc-500">Require an email code on every login.</p>
                          </div>
                        </div>
                        <Switch 
                          checked={profileData.twoFactorEnabled} 
                          onCheckedChange={async (checked) => {
                            setProfileData(p => ({ ...p, twoFactorEnabled: checked }))
                            try {
                              const res = await fetch("/api/user/profile", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ 
                                  fullName: profileData.fullName,
                                  phone: profileData.phone,
                                  avatar: profileData.avatar,
                                  twoFactorEnabled: checked 
                                })
                              })
                              if (!res.ok) throw new Error()
                              toast.success(checked ? "2FA Enabled" : "2FA Disabled")
                            } catch {
                              setProfileData(p => ({ ...p, twoFactorEnabled: !checked }))
                              toast.error("Failed to update 2FA setting")
                            }
                          }} 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-center pt-8">
                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 gap-2">
                       Delete My Account Data
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Star({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
  )
}
