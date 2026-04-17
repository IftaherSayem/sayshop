'use client'

import { useUIStore } from "@/stores/ui-store"
import { useCartStore } from "@/stores/cart-store"
import { useAuthStore } from "@/stores/auth-store"
import { Home, LayoutGrid, ShoppingCart, User, Shield } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const tabs = [
  { type: "home", label: "Home", icon: Home },
  { type: "products", label: "Products", icon: LayoutGrid },
  { type: "cart", label: "Cart", icon: ShoppingCart, badge: "cart" },
  { type: "profile", label: "Account", icon: User },
] as const

export function MobileBottomNav() {
  const currentView = useUIStore((s) => s.currentView)
  const setView = useUIStore((s) => s.setView)
  const totalCartItems = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0))

  const getIsActive = (tabType: string) => {
    if (tabType === "home") return currentView.type === "home"
    if (tabType === "products") return currentView.type === "products"
    if (tabType === "cart") return currentView.type === "cart"
    if (tabType === "profile") return currentView.type === "profile" || currentView.type === "orders" || currentView.type === "order-detail" || currentView.type === "order-confirmation"
    return false
  }

  const handleTabClick = (tabType: string) => {
    if (tabType === "products") {
      setView({ type: "products" })
    } else if (tabType === "cart") {
      setView({ type: "cart" })
    } else if (tabType === "profile") {
      setView({ type: "profile" })
    } else {
      setView({ type: "home" })
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:hidden pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = getIsActive(tab.type)
          const Icon = tab.icon
          const badgeCount = (tab as any).badge === "cart" ? totalCartItems : 0

          return (
            <button
              key={tab.type}
              onClick={() => handleTabClick(tab.type)}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -1 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Icon
                    className={`h-5 w-5 transition-colors duration-200 ${
                      isActive ? "text-blue-600" : "text-muted-foreground"
                    }`}
                  />
                </motion.div>
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
                <AnimatePresence>
                  {tab.type === "cart" && totalCartItems > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-blue-600 rounded-full border-2 border-background"
                    />
                  )}
                </AnimatePresence>
              </div>
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-blue-600" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-blue-600"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
