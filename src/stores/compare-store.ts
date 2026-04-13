import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

export interface CompareItem {
  productId: string;
  name: string;
  price: number;
  comparePrice: number | null;
  image: string;
  rating: number;
  reviewCount: number;
  brand: string | null;
  stock: number;
  category: string;
  description: string;
}

interface CompareStore {
  items: CompareItem[];
  addItem: (item: CompareItem) => void;
  removeItem: (productId: string) => void;
  toggleItem: (item: CompareItem) => void;
  clearAll: () => void;
  isInCompare: (productId: string) => boolean;
  getCount: () => number;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        if (items.length >= 4) {
          toast.error("You can compare up to 4 products at a time");
          return;
        }
        const exists = items.find(
          (i) => i.productId === item.productId
        );
        if (exists) return;
        set({ items: [...items, item] });
        toast.success("Added to comparison");
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      toggleItem: (item) => {
        const { isInCompare, addItem, removeItem } = get();
        if (isInCompare(item.productId)) {
          removeItem(item.productId);
          toast.success("Removed from comparison");
        } else {
          addItem(item);
        }
      },

      clearAll: () => set({ items: [] }),

      isInCompare: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },

      getCount: () => get().items.length,
    }),
    {
      name: "say-shop-compare",
      version: 3,
    }
  )
);
