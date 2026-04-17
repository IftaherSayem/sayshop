import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  comparePrice: number | null;
  image: string;
  addedAt: number;
}

interface WishlistStore {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  toggleItem: (item: WishlistItem) => void;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const exists = state.items.find(
            (i) => i.productId === item.productId
          );
          if (exists) return state;
          return { items: [...state.items, item] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      isInWishlist: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },

      clearWishlist: () => set({ items: [] }),

      toggleItem: (item) => {
        const { isInWishlist, addItem, removeItem } = get();
        if (isInWishlist(item.productId)) {
          removeItem(item.productId);
        } else {
          addItem(item);
        }
      },

      getTotalItems: () => get().items.length,
    }),
    {
      name: "say-shop-wishlist",
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version < 3) {
          return { items: [] };
        }
        return persistedState;
      },
    }
  )
);
