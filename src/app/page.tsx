'use client'

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useUIStore } from "@/stores/ui-store"
import { useAuthStore } from "@/stores/auth-store"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BackToTop } from "@/components/layout/back-to-top"
import { CartDrawer } from "@/components/cart/cart-drawer"
import { useIsHydrated } from "@/hooks/use-is-hydrated"
import dynamic from 'next/dynamic'

const CartPage = dynamic(() => import("@/components/cart/cart-page").then(mod => mod.CartPage), { ssr: false })
const CheckoutPage = dynamic(() => import("@/components/checkout/checkout-page").then(mod => mod.CheckoutPage), { ssr: false })
const ProductListing = dynamic(() => import("@/components/product/product-listing").then(mod => mod.ProductListing), { ssr: false })
const ProductDetail = dynamic(() => import("@/components/product/product-detail").then(mod => mod.ProductDetail), { ssr: false })
const OrderList = dynamic(() => import("@/components/order/order-list").then(mod => mod.OrderList), { ssr: false })
const OrderDetail = dynamic(() => import("@/components/order/order-detail").then(mod => mod.OrderDetail), { ssr: false })
const OrderConfirmation = dynamic(() => import("@/components/order/order-confirmation").then(mod => mod.OrderConfirmation), { ssr: false })
const WishlistPage = dynamic(() => import("@/components/product/wishlist-page").then(mod => mod.WishlistPage), { ssr: false })
const ComparePage = dynamic(() => import("@/components/product/compare-page").then(mod => mod.ComparePage), { ssr: false })
const ProfilePage = dynamic(() => import("@/components/user/profile-page").then(mod => mod.ProfilePage), { ssr: false })
const AuthPage = dynamic(() => import("@/components/auth/auth-page").then(mod => mod.AuthPage), { ssr: false })
const AdminPanel = dynamic(() => import("@/components/admin/admin-panel").then(mod => mod.AdminPanel), { ssr: false })
const ChatWidget = dynamic(() => import("@/components/chat/chat-widget").then(mod => mod.ChatWidget), { ssr: false })
const OrderTracking = dynamic(() => import("@/components/order/order-tracking").then(mod => mod.OrderTracking), { ssr: false })

import { HeroBanner } from "@/components/home/hero-banner"
import { PromoTicker } from "@/components/home/promo-ticker"
import { CategoryGrid } from "@/components/home/category-grid"
import { FeaturedProducts } from "@/components/home/featured-products"
import { DealsSection } from "@/components/home/deals-section"
import { HowItWorksSection } from "@/components/home/how-it-works-section"
import { StatsSection } from "@/components/home/stats-section"
import { BrandsSection } from "@/components/home/brands-section"
import { TestimonialsSection } from "@/components/home/testimonials-section"
import { WishlistSection } from "@/components/home/wishlist-section"
import { NewsletterSection } from "@/components/home/newsletter-section"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { CompareFloatingBar } from "@/components/product/compare-floating-bar"
import { LoadingScreen } from "@/components/layout/loading-screen"
import { ScrollProgress } from "@/components/layout/scroll-progress"
import { AnnouncementBanner } from "@/components/home/announcement-banner"
import { RecentlyViewedSection } from "@/components/home/recently-viewed-section"
import { RecommendationsSection } from "@/components/home/recommendations-section"
import { ReviewsShowcase } from "@/components/home/reviews-showcase"
import { ComboDealsSection } from "@/components/home/combo-deals-section"
import { SeasonalBanner } from "@/components/home/seasonal-banner"
import { Toaster } from "@/components/ui/sonner"

function ScrollToTop({ viewKey }: { viewKey: string }) {
  useEffect(() => {
    // Standard practice for page transitions: jump to top instantly
    // so the new page entrance animation happens at the correct scroll position.
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [viewKey])
  return null
}

const PageTransition = ({ children, viewKey }: { children: React.ReactNode; viewKey: string }) => (
  <motion.div
    key={viewKey}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25, ease: "easeOut" }}
  >
    {children}
  </motion.div>
)

function HomePage() {
  return (
    <>
      <HeroBanner />
      <PromoTicker />
      <SeasonalBanner />
      <CategoryGrid />
      <FeaturedProducts />
      <DealsSection />
      <ComboDealsSection />
      <HowItWorksSection />
      <StatsSection />
      <BrandsSection />
      <TestimonialsSection />
      <WishlistSection />
      <RecentlyViewedSection />
      <RecommendationsSection />
      <NewsletterSection />
      <ReviewsShowcase />
    </>
  )
}

export default function Home() {
  const currentView = useUIStore((state) => state.currentView)
  const initUrlSync = useUIStore((state) => state.initUrlSync)
  const isHydrated = useIsHydrated()
  const urlSyncInitialized = useRef(false)
  const authRestored = useRef(false)

  // Initialize URL sync once on mount
  useEffect(() => {
    if (!urlSyncInitialized.current) {
      urlSyncInitialized.current = true
      initUrlSync()
    }
  }, [initUrlSync])

  const { user, logout } = useAuthStore()

  // Dynamic Browser Tab Title & URL Auto-correct
  useEffect(() => {
    let title = "Say Shop - Your Premier Online Shopping Destination"
    
    if (currentView.type === "admin") {
      const isManager = user?.role?.toUpperCase() === 'MANAGER'
      title = (isManager ? "Control Panel" : "Admin Panel") + " | Say Shop"
      
      // Auto-correct URL if a manager is on /admin or an admin is on /manager
      const expectedUrl = isManager ? "/manager" : "/admin"
      if (typeof window !== "undefined" && window.location.pathname !== expectedUrl) {
        window.history.replaceState({ view: currentView }, "", expectedUrl)
      }
    } else if (currentView.type === "profile") {
      title = "My Account | Say Shop"
    } else if (currentView.type === "cart") {
      title = "Shopping Cart | Say Shop"
    } else if (currentView.type === "products") {
      title = (currentView.search ? `Search: ${currentView.search}` : "Products") + " | Say Shop"
    } else if (currentView.type === "checkout") {
      title = "Checkout | Say Shop"
    } else if (currentView.type === "orders") {
      title = "My Orders | Say Shop"
    } else if (currentView.type === "wishlist") {
      title = "Wishlist | Say Shop"
    } else if (currentView.type === "auth") {
      title = "Sign In | Say Shop"
    }
    
    document.title = title
  }, [currentView, user?.role])

  // Restore auth session on mount by verifying with server
  useEffect(() => {
    if (authRestored.current) return
    authRestored.current = true

    const restoreAuth = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            const isMasterAdmin = data.user.email?.toLowerCase() === 'admin@sayshop.com'
            useAuthStore.getState().setUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: isMasterAdmin ? 'ADMIN' : data.user.role,
            })
          }
        } else {
          // Session invalid, clear auth state
          useAuthStore.getState().logout()
        }
      } catch {
        // Network error, keep existing localStorage state
      }
    }
    restoreAuth()
  }, [])

  // Pre-hydration placeholder to avoid flicker
  if (!isHydrated) {
    return <LoadingScreen />
  }

  const viewKey = `${currentView.type}-${'productId' in currentView ? currentView.productId : ''}${'productSlug' in currentView ? currentView.productSlug : ''}${'orderId' in currentView ? currentView.orderId : ''}${'search' in currentView ? currentView.search : ''}${'categoryId' in currentView ? currentView.categoryId : ''}${'categorySlug' in currentView ? currentView.categorySlug : ''}${'minPrice' in currentView ? currentView.minPrice : ''}${'maxPrice' in currentView ? currentView.maxPrice : ''}`

  const isFullPageView =
    currentView.type === "cart" || currentView.type === "checkout" || currentView.type === "admin" || currentView.type === "order-confirmation"

  return (
    <>
      <LoadingScreen />
      <ScrollProgress />
      <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <Header />
      <CartDrawer />
      <Toaster
        richColors
        closeButton
        position="top-right"
      />
      <BackToTop />
      <OrderTracking />

      <ScrollToTop viewKey={viewKey} />

      <AnimatePresence mode="wait">
        <PageTransition key={viewKey} viewKey={viewKey}>
          <main className={isFullPageView ? "w-full" : "flex-1"}>
            {currentView.type === "home" && <HomePage />}
            {currentView.type === "products" && (
              <ProductListing
                key={`pl-${"categoryId" in currentView ? currentView.categoryId || "all" : "all"}-${"search" in currentView ? currentView.search || "" : ""}`}
                categoryId={"categoryId" in currentView ? currentView.categoryId : undefined}
                categorySlug={"categorySlug" in currentView ? currentView.categorySlug : undefined}
                search={"search" in currentView ? currentView.search : undefined}
                sort={"sort" in currentView ? currentView.sort : undefined}
                minPrice={"minPrice" in currentView ? currentView.minPrice : undefined}
                maxPrice={"maxPrice" in currentView ? currentView.maxPrice : undefined}
              />
            )}
            {currentView.type === "product-detail" && (
              <ProductDetail
                productId={currentView.productId}
                productSlug={"productSlug" in currentView ? currentView.productSlug : undefined}
              />
            )}
            {currentView.type === "cart" && <CartPage />}
            {currentView.type === "checkout" && <CheckoutPage />}
            {currentView.type === "admin" && <AdminPanel />}
            {currentView.type === "orders" && <OrderList />}
            {currentView.type === "order-detail" && (
              <OrderDetail orderId={currentView.orderId} />
            )}
            {currentView.type === "order-confirmation" && (
              <OrderConfirmation
                orderNumber={"orderNumber" in currentView ? currentView.orderNumber : ""}
                orderId={"orderId" in currentView ? currentView.orderId : ""}
              />
            )}
            {currentView.type === "wishlist" && <WishlistPage />}
            {currentView.type === "compare" && <ComparePage />}
            {currentView.type === "profile" && <ProfilePage />}
            {currentView.type === "auth" && (
              <AuthPage
                prefilledEmail={"prefilledEmail" in currentView ? currentView.prefilledEmail : undefined}
                authMode={"authMode" in currentView ? currentView.authMode : undefined}
              />
            )}
          </main>
          {!isFullPageView && <Footer />}
        </PageTransition>
      </AnimatePresence>
      <CompareFloatingBar />
      <MobileBottomNav />
      <ChatWidget />
    </div>
    </>
  )
}
