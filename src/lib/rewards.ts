/**
 * Say Rewards Standard Logic
 * - Earning: 10 points per $1 spent
 * - Redemption: 100 points = $1 discount
 */

export const REWARDS_CONFIG = {
  EARN_RATE: 10,       // Points per $1
  REDEMPTION_RATE: 100, // Points per $1 discount
  WELCOME_BONUS: 500,  // Initial points for new users
  TIERS: {
    BRONZE: { name: 'Bronze', minSpend: 0 },
    SILVER: { name: 'Silver', minSpend: 1000 },
    GOLD: { name: 'Gold', minSpend: 2500 },
  }
}

/**
 * Calculate points earned based on the currency amount
 */
export function calculatePointsEarned(amount: number): number {
  return Math.floor(amount * REWARDS_CONFIG.EARN_RATE)
}

/**
 * Convert points to their monetary value
 */
export function pointsToValue(points: number): number {
  return points / REWARDS_CONFIG.REDEMPTION_RATE
}

/**
 * Convert monetary value back to points
 */
export function valueToPoints(value: number): number {
  return value * REWARDS_CONFIG.REDEMPTION_RATE
}

/**
 * Determine the user's tier based on their total lifetime spend
 */
export function determineTier(lifeTimeSpend: number): string {
  if (lifeTimeSpend >= REWARDS_CONFIG.TIERS.GOLD.minSpend) return REWARDS_CONFIG.TIERS.GOLD.name
  if (lifeTimeSpend >= REWARDS_CONFIG.TIERS.SILVER.minSpend) return REWARDS_CONFIG.TIERS.SILVER.name
  return REWARDS_CONFIG.TIERS.BRONZE.name
}
