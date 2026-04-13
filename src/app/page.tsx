'use client'

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useUIStore } from "@/stores/ui-store"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BackToTop } from "@/components/layout/back-to-top"
import { CartDrawer } from "@/components/cart/cart-drawer"
import { CartPage } from "@/components/cart/cart-page"
import { CheckoutPage } from "@/components/checkout/checkout-page"
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
import { ProductListing } from "@/components/product/product-listing"
import { ProductDetail } from "@/components/product/product-detail"
import { OrderList } from "@/components/order/order-list"
import { OrderDetail } from "@/components/order/order-detail"
import { OrderConfirmation } from "@/components/order/order-confirmation"
import { WishlistPage } from "@/components/product/wishlist-page"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { ComparePage } from "@/components/product/compare-page"
import { CompareFloatingBar } from "@/components/product/compare-floating-bar"
import { ChatWidget } from "@/components/chat/chat-widget"
import { LoadingScreen } from "@/components/layout/loading-screen"
import { ScrollProgress } from "@/components/layout/scroll-progress"
import { AnnouncementBanner } from "@/components/home/announcement-banner"
import { RecentlyViewedSection } from "@/components/home/recently-viewed-section"
import { RecommendationsSection } from "@/components/home/recommendations-section"
import { ReviewsShowcase } from "@/components/home/reviews-showcase"
import { ComboDealsSection } from "@/components/home/combo-deals-section"
import { SeasonalBanner } from "@/components/home/seasonal-banner"
import { OrderTracking } from "@/components/order/order-tracking"
import { ProfilePage } from "@/components/user/profile-page"
import { AuthPage } from "@/components/auth/auth-page"
import { AdminPanel } from "@/components/admin/admin-panel"
import { Toaster } from "@/components/ui/sonner"

function ScrollToTop({ viewKey }: { viewKey: string }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
  const urlSyncInitialized = useRef(false)
  const authRestored = useRef(false)

  // Initialize URL sync once on mount
  useEffect(() => {
    if (!urlSyncInitialized.current) {
      urlSyncInitialized.current = true
      initUrlSync()
    }
  }, [initUrlSync])

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
            const { setUser } = await import("@/stores/auth-store")
            setUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
            })
          }
        } else {
          // Session invalid, clear auth state
          const { useAuthStore } = await import("@/stores/auth-store")
          useAuthStore.getState().logout()
        }
      } catch {
        // Network error, keep existing localStorage state
      }
    }
    restoreAuth()
  }, [])

  const viewKey = `${currentView.type}-${'productId' in currentView ? currentView.productId : ''}${'productSlug' in currentView ? currentView.productSlug : ''}${'orderId' in currentView ? currentView.orderId : ''}${'search' in currentView ? currentView.search : ''}${'categoryId' in currentView ? currentView.categoryId : ''}${'categorySlug' in currentView ? currentView.categorySlug : ''}${'minPrice' in currentView ? currentView.minPrice : ''}${'maxPrice' in currentView ? currentView.maxPrice : ''}`

  const isFullPageView =
    currentView.type === "cart" || currentView.type === "checkout" || currentView.type === "admin" || currentView.type === "order-confirmation"

  return (
    <>
      <LoadingScreen />
      <ScrollProgress />
      <AnnouncementBanner />
      <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <Header />
      <CartDrawer />
      <Toaster
        richColors
        position="top-right"
        toastOptions={{
          classNames: {
            toast: 'shadow-lg border-border/50',
            success: 'border-green-200 dark:border-green-800/50',
            error: 'border-red-200 dark:border-red-800/50',
            warning: 'border-amber-200 dark:border-amber-800/50',
            info: 'border-blue-200 dark:border-blue-800/50',
          },
        }}
      />
      <BackToTop />
      <OrderTracking />

      <ScrollToTop viewKey={viewKey} />

      <AnimatePresence mode="wait">
        {isFullPageView ? (
          <PageTransition key={`full-${viewKey}`} viewKey={viewKey}>
            {currentView.type === "cart" && <CartPage />}
            {currentView.type === "checkout" && <CheckoutPage />}
            {currentView.type === "admin" && <AdminPanel />}
            {currentView.type === "order-confirmation" && (
              <OrderConfirmation
                orderNumber={
                  "orderNumber" in currentView ? currentView.orderNumber : ""
                }
                orderId={
                  "orderId" in currentView ? currentView.orderId : ""
                }
              />
            )}
          </PageTransition>
        ) : (
          <PageTransition key={`main-${viewKey}`} viewKey={viewKey}>
            <main className="flex-1">
              {currentView.type === "home" && <HomePage />}
              {currentView.type === "products" && (
                <ProductListing
                  key={`pl-${"categoryId" in currentView ? currentView.categoryId || "all" : "all"}-${"search" in currentView ? currentView.search || "" : ""}`}
                  categoryId={
                    "categoryId" in currentView ? currentView.categoryId : undefined
                  }
                  categorySlug={
                    "categorySlug" in currentView ? currentView.categorySlug : undefined
                  }
                  search={
                    "search" in currentView ? currentView.search : undefined
                  }
                  sort={
                    "sort" in currentView ? currentView.sort : undefined
                  }
                  minPrice={
                    "minPrice" in currentView ? currentView.minPrice : undefined
                  }
                  maxPrice={
                    "maxPrice" in currentView ? currentView.maxPrice : undefined
                  }
                />
              )}
              {currentView.type === "product-detail" && (
                <ProductDetail
                  productId={currentView.productId}
                  productSlug={"productSlug" in currentView ? currentView.productSlug : undefined}
                />
              )}
              {currentView.type === "orders" && <OrderList />}
              {currentView.type === "order-detail" && (
                <OrderDetail orderId={currentView.orderId} />
              )}
              {currentView.type === "wishlist" && <WishlistPage />}
              {currentView.type === "compare" && <ComparePage />}
              {currentView.type === "profile" && <ProfilePage />}
              {currentView.type === "auth" && (
                <AuthPage
                  prefilledEmail={"prefilledEmail" in currentView ? currentView.prefilledEmail : undefined}
                />
              )}
            </main>
            <Footer />
          </PageTransition>
        )}
      </AnimatePresence>
      <CompareFloatingBar />
      <MobileBottomNav />
      <ChatWidget />
    </div>
    </>
  )
}
