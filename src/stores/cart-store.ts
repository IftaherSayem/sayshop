import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types";

interface CartStore {
  items: CartItem[];
  savedForLater: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getShipping: () => number;
  getTax: () => number;
  getTotal: () => number;
  saveForLater: (productId: string) => void;
  moveToCart: (productId: string) => void;
  removeFromSaved: (productId: string) => void;
  savedTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      savedForLater: [],
      isOpen: false,

      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.productId === item.productId
          );
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.min(quantity, i.stock) }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      getShipping: () => {
        const subtotal = get().getSubtotal();
        return subtotal > 50 ? 0 : 9.99;
      },
      getTax: () => get().getSubtotal() * 0.08,
      getTotal: () => get().getSubtotal() + get().getShipping() + get().getTax(),

      saveForLater: (productId) => {
        const state = get();
        const item = state.items.find((i) => i.productId === productId);
        if (!item) return;
        set({
          items: state.items.filter((i) => i.productId !== productId),
          savedForLater: [...state.savedForLater, item],
        });
      },

      moveToCart: (productId) => {
        const state = get();
        const item = state.savedForLater.find((i) => i.productId === productId);
        if (!item) return;
        const existingCartItem = state.items.find((i) => i.productId === productId);
        if (existingCartItem) {
          set({
            items: state.items.map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
                : i
            ),
            savedForLater: state.savedForLater.filter((i) => i.productId !== productId),
          });
        } else {
          set({
            items: [...state.items, item],
            savedForLater: state.savedForLater.filter((i) => i.productId !== productId),
          });
        }
      },

      removeFromSaved: (productId) => {
        set((state) => ({
          savedForLater: state.savedForLater.filter((i) => i.productId !== productId),
        }));
      },

      savedTotal: () => get().savedForLater.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: "say-shop-cart",
      version: 3,
      partialize: (state) => ({ items: state.items, savedForLater: state.savedForLater }),
      merge: (persisted, current) => {
        const p = persisted as { items?: CartItem[]; savedForLater?: CartItem[]; _version?: number };
        // If version changed or no valid persisted state, start fresh
        if (!p || !p._version || p._version < 3) {
          return { ...current, items: [], savedForLater: [] };
        }
        const validItems = (p.items || []).filter(
          (item) => item.productId && !item.productId.startsWith("combo-") && item.name && item.price > 0
        );
        const validSaved = (p.savedForLater || []).filter(
          (item) => item.productId && !item.productId.startsWith("combo-") && item.name && item.price > 0
        );
        return {
          ...current,
          items: validItems,
          savedForLater: validSaved,
        };
      },
    }
  )
);
