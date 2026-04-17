import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RewardsHistoryEntry {
  id: string;
  points: number;
  reason: string;
  date: string;
}

interface RewardsStore {
  points: number;
  history: RewardsHistoryEntry[];
  addPoints: (points: number, reason: string) => void;
  redeemPoints: (points: number, reason: string) => void;
}

export const useRewardsStore = create<RewardsStore>()(
  persist(
    (set, get) => ({
      points: 250,
      history: [
        {
          id: "welcome-bonus",
          points: 250,
          reason: "Welcome bonus — thanks for joining Say Shop!",
          date: new Date().toISOString(),
        },
      ],

      addPoints: (points: number, reason: string) => {
        const entry: RewardsHistoryEntry = {
          id: `add-${Date.now()}`,
          points,
          reason,
          date: new Date().toISOString(),
        };
        set((state) => ({
          points: state.points + points,
          history: [entry, ...state.history],
        }));
      },

      redeemPoints: (points: number, reason: string) => {
        const currentPoints = get().points;
        if (points > currentPoints) return;
        const entry: RewardsHistoryEntry = {
          id: `redeem-${Date.now()}`,
          points: -points,
          reason,
          date: new Date().toISOString(),
        };
        set((state) => ({
          points: state.points - points,
          history: [entry, ...state.history],
        }));
      },
    }),
    {
      name: "say-shop-rewards",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return { points: 250, history: [] };
        }
        return persistedState;
      },
    }
  )
);
