import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

export interface StockAlert {
  productId: string;
  productName: string;
  productImage: string;
  notifiedAt: string | null;
}

const MAX_ALERTS = 10;

interface StockAlertStore {
  alerts: StockAlert[];
  addAlert: (product: Omit<StockAlert, "notifiedAt">) => void;
  removeAlert: (productId: string) => void;
  isAlerted: (productId: string) => boolean;
  getAlerts: () => StockAlert[];
}

export const useStockAlertStore = create<StockAlertStore>()(
  persist(
    (set, get) => ({
      alerts: [],

      addAlert: (product) => {
        set((state) => {
          if (state.alerts.some((a) => a.productId === product.productId)) {
            return state;
          }
          if (state.alerts.length >= MAX_ALERTS) {
            toast.warning(
              `You can only track up to ${MAX_ALERTS} products. Remove an existing alert first.`
            );
            return state;
          }
          return {
            alerts: [
              ...state.alerts,
              { ...product, notifiedAt: null },
            ],
          };
        });
      },

      removeAlert: (productId) => {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.productId !== productId),
        }));
      },

      isAlerted: (productId) => {
        return get().alerts.some((a) => a.productId === productId);
      },

      getAlerts: () => get().alerts,
    }),
    {
      name: "say-shop-stock-alerts",
      version: 2,
    }
  )
);
