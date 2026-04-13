'use client'

import { useEffect, useState, useCallback, useRef } from "react"
import { useCartStore } from "@/stores/cart-store"
import { useWishlistStore } from "@/stores/wishlist-store"
import { useCompareStore } from "@/stores/compare-store"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  ShoppingCart,
  Search,
  User,
  Heart,
  ShoppingBag,
  Menu,
  ChevronDown,
  Sun,
  Moon,
  Loader2,
  SearchX,
  GitCompareArrows,
  Package,
  LogOut,
  Shield,
} from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { formatPrice } from "@/lib/types"
import type { Category, Product } from "@/lib/types"
import { NotificationDropdown } from "@/components/layout/notification-dropdown"
import Image from "next/image"

interface SearchSuggestion {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  image: string;
}

export function Header() {
  const cartItems = useCartStore((s) => s.items)
  const wishlistItems = useWishlistStore((s) => s.items)
  const compareItems = useCompareStore((s) => s.items)
  const { user: authUser, isAuthenticated, logout } = useAuthStore()
  const setView = useUIStore((s) => s.setView)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const openCart = useUIStore((s) => s.setView).bind(null, { type: "cart" })

  const [categories, setCategories] = useState<Category[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lang, setLang] = useState<"EN" | "ES">("EN")
  const { theme, setTheme } = useTheme()

  // Search suggestions state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Scroll-based header blur effect
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => {})
  }, [])

  // Fetch search suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const trimmed = searchInput.trim()
    if (!trimmed) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const params = new URLSearchParams({
          search: trimmed,
          limit: "5",
        })
        const res = await fetch(`/api/products?${params}`)
        if (!res.ok) {
          setSuggestions([])
          return
        }
        const data = await res.json()
        const products: Product[] = data.products || []
        setSuggestions(
          products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            comparePrice: p.comparePrice,
            image: p.images?.startsWith("[")
              ? JSON.parse(p.images)[0]?.url || "/images/products/headphones.png"
              : p.images || "/images/products/headphones.png",
          }))
        )
      } catch {
        setSuggestions([])
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchInput])

  // Close suggestions on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const handleSearch = useCallback(() => {
    const trimmed = searchInput.trim()
    if (!trimmed) return
    setSearchQuery(trimmed)
    setView({ type: "products", search: trimmed })
    setShowSuggestions(false)
  }, [searchInput, setSearchQuery, setView])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch()
    },
    [handleSearch]
  )

  const handleSuggestionClick = (productId: string) => {
    setShowSuggestions(false)
    setSearchInput("")
    setView({ type: "product-detail", productId })
  }

  const navigateHome = useCallback(() => {
    setView({ type: "home" })
  }, [setView])

  const navigateToProducts = useCallback(
    (categoryId?: string) => {
      if (categoryId) {
        setView({ type: "products", categoryId })
      } else {
        setView({ type: "products" })
      }
    },
    [setView]
  )

  const navigateToCart = useCallback(() => {
    setView({ type: "cart" })
  }, [setView])

  const navigateToOrders = useCallback(() => {
    setView({ type: "orders" })
  }, [setView])

  const navigateToProfile = useCallback(() => {
    if (!isAuthenticated) {
      setView({ type: "auth" })
      return
    }
    setView({ type: "profile" })
  }, [setView, isAuthenticated])

  const navigateToAuth = useCallback(() => {
    setView({ type: "auth" })
  }, [setView])

  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" })
    } catch {
      // ignore
    }
    logout()
    setView({ type: "home" })
  }, [logout, setView])

  // Render search suggestions dropdown
  const renderSuggestionsDropdown = () => {
    if (!showSuggestions && !suggestionsLoading) return null

    return (
      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
        {suggestionsLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        ) : suggestions.length === 0 && searchInput.trim() ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <SearchX className="h-8 w-8 opacity-40" />
            <span className="text-sm">No products found</span>
          </div>
        ) : (
          <>
            <div className="max-h-80 overflow-y-auto">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleSuggestionClick(item.id)}
                >
                  <div className="h-10 w-10 shrink-0 rounded-md overflow-hidden bg-muted border border-border/50">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-orange-500">
                        {formatPrice(item.price)}
                      </span>
                      {item.comparePrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(item.comparePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t">
              <button
                className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 text-sm text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors font-medium"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
                View all results for &ldquo;{searchInput.trim()}&rdquo;
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* ===== Top Promo Bar ===== */}
      <div className="bg-neutral-900 text-neutral-300 text-xs sm:text-sm">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4">
          <span className="hidden sm:inline">
            Free shipping on orders over $50 🚚
          </span>
          <span className="sm:hidden flex-1 text-center">
            Free shipping over $50 🚚
          </span>

          {/* Language selector */}
          <button
            onClick={() => setLang(lang === "EN" ? "ES" : "EN")}
            className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 transition-colors hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <GlobeIcon className="h-3.5 w-3.5" />
            {lang}
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ===== Main Bar ===== */}
      <div className={`border-b bg-background transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-md shadow-sm' : ''}`}>
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16">
          {/* Mobile hamburger */}
          <button
            className="flex items-center lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <button
            onClick={navigateHome}
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
          >
            <Image src="/images/logo.png" alt="Say Shop" width={40} height={40} className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover" />
            <span className="text-lg font-bold tracking-tight text-orange-500 sm:text-xl">
              Say Shop
            </span>
          </button>

          {/* Search Bar — hidden on mobile, shown in Sheet instead */}
          <div className="hidden flex-1 items-center gap-0 md:flex">
            <div className="relative flex w-full max-w-2xl" ref={searchContainerRef}>
              <div className="relative flex w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search products, brands, categories..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => {
                    if (searchInput.trim()) setShowSuggestions(true)
                  }}
                  onKeyDown={handleKeyDown}
                  className="h-11 pl-10 pr-4 rounded-xl border-border/60 bg-muted/40 focus-visible:bg-background focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500/20 transition-all duration-200 shadow-sm focus-visible:shadow-md focus-visible:shadow-orange-500/10"
                />
              </div>
              {showSuggestions && searchInput.trim() && (
                <Button
                  onClick={handleSearch}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 rounded-lg bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
              {renderSuggestionsDropdown()}
            </div>
          </div>

          {/* Right Icons */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {/* Compare */}
            <button
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label="Compare"
              onClick={() => setView({ type: "compare" })}
            >
              <GitCompareArrows className="h-5 w-5" />
              {compareItems.length > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 p-0 text-[10px] font-bold text-white border-0">
                  {compareItems.length > 99 ? "99+" : compareItems.length}
                </Badge>
              )}
            </button>

            {/* Wishlist */}
            <button
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label="Wishlist"
              onClick={() => setView({ type: "wishlist" })}
            >
              <Heart className="h-5 w-5" />
              {wishlistItems.length > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 p-0 text-[10px] font-bold text-white border-0">
                  {wishlistItems.length > 99 ? "99+" : wishlistItems.length}
                </Badge>
              )}
            </button>

            {/* Notifications (hidden on small mobile screens) */}
            <div className="hidden sm:block">
              <NotificationDropdown />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            </button>

            {/* Admin Panel Quick Access */}
            {isAuthenticated && authUser?.role?.toUpperCase() === 'ADMIN' && (
              <button
                onClick={() => setView({ type: "admin" })}
                className="relative flex h-10 items-center gap-1.5 rounded-full px-3 bg-orange-500 text-white text-xs font-semibold transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-label="Admin Panel"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  aria-label="Account"
                >
                  <User className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isAuthenticated ? (
                  <>
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{authUser?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{authUser?.email}</p>
                    </div>
                    <DropdownMenuItem onClick={navigateToProfile} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      My Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={navigateToOrders} className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setView({ type: "wishlist" })} className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      My Wishlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setView({ type: "compare" })} className="cursor-pointer">
                      <GitCompareArrows className="mr-2 h-4 w-4" />
                      Compare Products
                    </DropdownMenuItem>
                    {authUser?.role?.toUpperCase() === 'ADMIN' && (
                      <DropdownMenuItem onClick={() => setView({ type: "admin" })} className="cursor-pointer text-orange-600 focus:text-orange-600">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-500 focus:text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={navigateToAuth} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Sign In / Sign Up
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={navigateToOrders} className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setView({ type: "wishlist" })} className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      My Wishlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setView({ type: "compare" })} className="cursor-pointer">
                      <GitCompareArrows className="mr-2 h-4 w-4" />
                      Compare Products
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cart */}
            <button
              onClick={navigateToCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {totalItems > 0 && (
                  <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 p-0 text-[10px] font-bold text-white border-0">
                    <motion.span
                      key={totalItems}
                      initial={{ scale: 0.5, y: -10 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      {totalItems > 99 ? "99+" : totalItems}
                    </motion.span>
                  </Badge>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="flex gap-0 px-4 pb-3 md:hidden">
          <div className="relative flex w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-10 pl-10 pr-4 rounded-xl border-border/60 bg-muted/40 focus-visible:bg-background focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500/20 transition-all duration-200"
            />
            <Button
              onClick={handleSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ===== Categories Bar ===== */}
      {categories.length > 0 && (
        <nav className="hidden border-b bg-neutral-50 dark:bg-neutral-900/50 lg:block">
          <div className="mx-auto max-w-7xl px-4">
            <ul className="flex items-center gap-1 overflow-x-auto py-2" style={{ scrollbarWidth: "none" }}>
              <li>
                <button
                  onClick={() => navigateToProducts()}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  All Products
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => navigateToProducts(cat.id)}
                    className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-neutral-400 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      {/* ===== Mobile Menu Sheet ===== */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="Say Shop" width={32} height={32} className="h-6 w-6 rounded-md object-cover" />
              <span className="text-orange-500">Say Shop</span>
            </SheetTitle>
          </SheetHeader>

          {/* Mobile categories list */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Shop by Category
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => {
                    navigateToProducts()
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-neutral-200 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  All Products
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => {
                      navigateToProducts(cat.id)
                      setMobileMenuOpen(false)
                    }}
                    className="flex w-full items-center rounded-md px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>

            <div className="my-4 border-t" />

            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Account
            </h3>
            <ul className="space-y-1">
              {isAuthenticated && authUser ? (
                <li className="px-3 py-2 mb-1">
                  <p className="text-sm font-medium text-foreground truncate">Hi, {authUser.name}!</p>
                  <p className="text-xs text-muted-foreground truncate">{authUser.email}</p>
                </li>
              ) : null}
              <li>
                <button
                  onClick={() => {
                    navigateToProfile()
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <User className="h-4 w-4" />
                  {isAuthenticated ? "My Account" : "Sign In / Sign Up"}
                </button>
              </li>
              {isAuthenticated && (
                <li>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setMobileMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    navigateToOrders()
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <Package className="h-4 w-4" />
                  My Orders
                </button>
              </li>
              {authUser?.role?.toUpperCase() === 'ADMIN' && (
                <li>
                  <button
                    onClick={() => {
                      setView({ type: "admin" })
                      setMobileMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-orange-600 font-medium transition-colors hover:bg-orange-50 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    setView({ type: "wishlist" })
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <Heart className="h-4 w-4" />
                  Wishlist
                  {wishlistItems.length > 0 && (
                    <Badge className="ml-auto h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white border-0">
                      {wishlistItems.length}
                    </Badge>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setView({ type: "compare" })
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <GitCompareArrows className="h-4 w-4" />
                  Compare
                  {compareItems.length > 0 && (
                    <Badge className="ml-auto h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white border-0">
                      {compareItems.length}
                    </Badge>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    navigateToCart()
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-orange-950 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Cart
                  {totalItems > 0 && (
                    <Badge className="ml-auto h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white border-0">
                      {totalItems}
                    </Badge>
                  )}
                </button>
              </li>
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}

/** Small inline globe SVG icon */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}
