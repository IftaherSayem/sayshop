import { REWARDS_CONFIG } from "./rewards"

export interface TierProgress {
  currentTier: string
  nextTier: string | null
  pointsToNext: number
  percentComplete: number
}

/**
 * Calculate the progress to the next loyalty tier
 */
export function calculateTierProgress(points: number): TierProgress {
  const tiers = REWARDS_CONFIG.TIERS
  let currentTier = "Bronze"
  let nextTier: string | null = "Silver"
  let targetPoints = tiers.SILVER.minSpend * 10 // conversion: 10 points per $1 spend

  if (points >= tiers.GOLD.minSpend * 10) {
    currentTier = "Gold"
    nextTier = null
    targetPoints = points // Maxed out
  } else if (points >= tiers.SILVER.minSpend * 10) {
    currentTier = "Silver"
    nextTier = "Gold"
    targetPoints = tiers.GOLD.minSpend * 10
  }

  if (!nextTier) {
    return {
      currentTier,
      nextTier,
      pointsToNext: 0,
      percentComplete: 100
    }
  }

  const prevThreshold = currentTier === "Silver" ? tiers.SILVER.minSpend * 10 : 0
  const totalInTier = targetPoints - prevThreshold
  const pointsSinceThreshold = points - prevThreshold
  const percentComplete = Math.min(100, Math.max(0, (pointsSinceThreshold / totalInTier) * 100))

  return {
    currentTier,
    nextTier,
    pointsToNext: Math.max(0, targetPoints - points),
    percentComplete
  }
}
