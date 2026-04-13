import { create } from "zustand";
import type { AppView } from "@/lib/types";
import { viewToUrl, urlToView } from "@/lib/types";

interface UIStore {
  currentView: AppView;
  viewHistory: AppView[];
  isSearchOpen: boolean;
  searchQuery: string;
  setView: (view: AppView) => void;
  goBack: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  /** Initialize URL sync (call once from a component on mount) */
  initUrlSync: () => void;
  /** Whether URL sync has been initialized */
  _urlSyncReady: boolean;
}

export const useUIStore = create<UIStore>((set, get) => ({
  currentView: { type: "home" },
  viewHistory: [],
  isSearchOpen: false,
  searchQuery: "",
  _urlSyncReady: false,

  setView: (view) => {
    set((state) => ({
      currentView: view,
      viewHistory: [...state.viewHistory, state.currentView],
      isSearchOpen: false,
    }));

    // Sync to browser URL after state update
    if (typeof window !== "undefined") {
      const url = viewToUrl(view);
      const fullUrl = `${window.location.origin}${url}`;
      window.history.pushState({ view }, "", url);
      // Update document title (async to allow product name fetch)
      updateTitle(view);
    }
  },

  goBack: () => {
    set((state) => {
      const history = [...state.viewHistory];
      const previousView = history.pop();
      return {
        currentView: previousView || { type: "home" },
        viewHistory: history,
      };
    });

    // Sync browser back navigation
    // pushState is handled by popstate listener below, but if the user
    // calls goBack programmatically (not via browser), we also push
    if (typeof window !== "undefined") {
      const view = get().currentView;
      const url = viewToUrl(view);
      window.history.pushState({ view }, "", url);
      updateTitle(view);
    }
  },

  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  initUrlSync: () => {
    if (typeof window === "undefined") return;
    const state = get();
    if (state._urlSyncReady) return;

    // Mark as initialized
    set({ _urlSyncReady: true });

    // Parse current URL and set the initial view
    const view = urlToView(window.location.pathname, window.location.search);
    set({ currentView: view });
    updateTitle(view);

    // Replace the current history entry so back doesn't go to a duplicate
    window.history.replaceState({ view }, "", viewToUrl(view));

    // Listen for browser back/forward
    window.addEventListener("popstate", (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        // Use the view stored in history state
        set((s) => ({
          currentView: event.state.view as AppView,
          viewHistory: [...s.viewHistory, s.currentView],
          isSearchOpen: false,
        }));
        updateTitle(event.state.view as AppView);
      } else {
        // Parse from URL as fallback
        const parsed = urlToView(window.location.pathname, window.location.search);
        set((s) => ({
          currentView: parsed,
          viewHistory: [...s.viewHistory, s.currentView],
          isSearchOpen: false,
        }));
        updateTitle(parsed);
      }
    });
  },
}));

/**
 * Update document title based on the current view.
 * For product-detail views, fetches the product name asynchronously.
 */
function updateTitle(view: AppView) {
  if (typeof document === "undefined") return;
  const baseTitle = "SayShop";

  switch (view.type) {
    case "home":
      document.title = baseTitle;
      break;
    case "products":
      document.title = view.search
        ? `Search: ${view.search} - ${baseTitle}`
        : "All Products - " + baseTitle;
      break;
    case "product-detail": {
      document.title = "Product - " + baseTitle;
      // Fetch product name asynchronously for better title
      const productId = view.productId;
      const fetchUrl = view.productSlug
        ? `/api/products/slug/${encodeURIComponent(view.productSlug)}`
        : `/api/products/${productId}`;
      fetch(fetchUrl)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.name && typeof document !== "undefined") {
            document.title = `${data.name} - ${baseTitle}`;
          }
        })
        .catch(() => {
          // Keep fallback title
        });
      break;
    }
    case "cart":
      document.title = "Cart - " + baseTitle;
      break;
    case "checkout":
      document.title = "Checkout - " + baseTitle;
      break;
    case "orders":
      document.title = "My Orders - " + baseTitle;
      break;
    case "order-detail":
      document.title = "Order Details - " + baseTitle;
      break;
    case "wishlist":
      document.title = "Wishlist - " + baseTitle;
      break;
    case "compare":
      document.title = "Compare Products - " + baseTitle;
      break;
    case "profile":
      document.title = "My Profile - " + baseTitle;
      break;
    case "auth":
      document.title = "Sign In - " + baseTitle;
      break;
    case "admin":
      document.title = "Admin Panel - " + baseTitle;
      break;
    default:
      document.title = baseTitle;
  }
}
