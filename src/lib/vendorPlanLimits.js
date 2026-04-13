/**
 * vendorPlanLimits.js
 *
 * Single source of truth for online vendor plan limits and feature access.
 * Mobile-safe — no DOM/window dependencies.
 *
 * Usage:
 *   import { getVendorLimits, vendorCanAccess } from '../../lib/vendorPlanLimits'
 *
 *   const limits = getVendorLimits('hustle')
 *   const canExport = vendorCanAccess('hustle', 'csvExport')
 */

// ── Plan definitions ──────────────────────────────────────────────────────────
const VENDOR_PLAN_LIMITS = {
    solo: {
        ordersPerMonth: 100,
        products: 50,
        users: 1,
    },
    hustle: {
        ordersPerMonth: 500,
        products: Infinity,
        users: 2,
    },
    scale: {
        ordersPerMonth: Infinity,
        products: Infinity,
        users: 5,
    },
    combo_basic: {
        ordersPerMonth: 100,
        products: 50,
        users: 2,
    },
    combo_standard: {
        ordersPerMonth: 500,
        products: 200,
        users: 15,
    },
    combo_premium: {
        ordersPerMonth: Infinity,
        products: Infinity,
        users: Infinity,
    },
}

// ── Feature access map ────────────────────────────────────────────────────────
// true = feature available on that tier
const VENDOR_FEATURES = {
    // Available to all tiers
    orders: { solo: true, hustle: true, scale: true, combo_basic: true, combo_standard: true, combo_premium: true },
    inventory: { solo: true, hustle: true, scale: true, combo_basic: true, combo_standard: true, combo_premium: true },
    customers: { solo: true, hustle: true, scale: true, combo_basic: true, combo_standard: true, combo_premium: true },
    logisticsDirectory: { solo: true, hustle: true, scale: true, combo_basic: true, combo_standard: true, combo_premium: true },
    invoices: { solo: true, hustle: true, scale: true, combo_basic: true, combo_standard: true, combo_premium: true },
    importData: { solo: true, hustle: true, scale: true, combo_basic: true, combo_standard: true, combo_premium: true },

    // Hustle and above (combo_standard = Hustle level, combo_premium = Scale level)
    paymentsPage: { solo: false, hustle: true, scale: true, combo_basic: false, combo_standard: true, combo_premium: true },
    deliveryTracker: { solo: false, hustle: true, scale: true, combo_basic: false, combo_standard: true, combo_premium: true },
    ordersBySource: { solo: false, hustle: true, scale: true, combo_basic: false, combo_standard: true, combo_premium: true },
    reports: { solo: false, hustle: true, scale: true, combo_basic: false, combo_standard: true, combo_premium: true },
    fullReports: { solo: false, hustle: true, scale: true, combo_basic: false, combo_standard: true, combo_premium: true },

    // Scale only (combo_premium only)
    storefront: { solo: false, hustle: false, scale: true, combo_basic: false, combo_standard: false, combo_premium: true },
    csvExport: { solo: false, hustle: false, scale: true, combo_basic: false, combo_standard: false, combo_premium: true },
}

/**
 * getEffectiveTier
 *
 * IMPORTANT: Always use this instead of reading subscription_tier directly
 * for any limit or feature check.
 *
 * Trialing vendors get full Scale access regardless of which tier they
 * trialed on. Active subscribers get their actual tier. Anyone else gets solo.
 *
 * @param {string} tier - subscription_tier from profile
 * @param {string} status - subscription status from profile
 * @returns {'solo'|'hustle'|'scale'|'combo_basic'|'combo_standard'|'combo_premium'}
 */
export function getEffectiveTier(tier, status) {
    // Trialing = full Scale access always
    if (status === 'trialing') return 'scale'

    // Known tiers pass through (including combo plans)
    if (tier === 'solo' || tier === 'hustle' || tier === 'scale') return tier
    if (tier === 'combo_basic') return 'combo_basic'
    if (tier === 'combo_standard') return 'combo_standard'
    if (tier === 'combo_premium') return 'combo_premium'

    // Fallback
    return 'solo'
}

/**
 * Get numeric limits for a vendor plan tier.
 * Pass tier + status from profile.subscription to get correct limits.
 * @param {string} tier
 * @param {string} [status]
 * @returns {Object} limits object
 */
export function getVendorLimits(tier, status) {
    const effective = getEffectiveTier(tier, status)
    return VENDOR_PLAN_LIMITS[effective] ?? VENDOR_PLAN_LIMITS.solo
}

/**
 * Check if a vendor plan tier can access a specific feature.
 * @param {string} tier
 * @param {string} feature
 * @param {string} [status] - subscription status, pass to handle trialing correctly
 * @returns {boolean}
 */
export function vendorCanAccess(tier, feature, status) {
    const effective = getEffectiveTier(tier, status)
    const featureMap = VENDOR_FEATURES[feature]
    if (!featureMap) return false
    return featureMap[effective] ?? false
}

/**
 * Get the minimum tier required for a feature.
 * @param {string} feature
 * @returns {'solo'|'hustle'|'scale'|'combo_basic'|'combo_standard'|'combo_premium'|null}
 */
export function minTierForFeature(feature) {
    const featureMap = VENDOR_FEATURES[feature]
    if (!featureMap) return null

    // Check combo tiers first (in order of ascending access)
    if (featureMap.combo_basic) return 'combo_basic'
    if (featureMap.combo_standard) return 'combo_standard'
    if (featureMap.combo_premium) return 'combo_premium'

    // Check regular vendor tiers
    if (featureMap.solo) return 'solo'
    if (featureMap.hustle) return 'hustle'
    if (featureMap.scale) return 'scale'

    return null
}

/**
 * Human-readable upgrade message for a locked feature.
 * @param {string} feature
 * @returns {string}
 */
export function upgradeMessage(feature) {
    const min = minTierForFeature(feature)
    const labels = {
        hustle: 'Hustle',
        scale: 'Scale',
        combo_standard: 'Standard',
        combo_premium: 'Premium'
    }
    if (!min || min === 'solo') return ''
    if (min === 'combo_basic') return 'This feature is available on the Standard plan and above.'
    if (min === 'combo_standard') return 'This feature is available on the Standard plan and above.'
    if (min === 'combo_premium') return 'This feature is available on the Premium plan and above.'
    return `This feature is available on the ${labels[min]} plan and above.`
}

// ── Reusable locked feature UI props ─────────────────────────────────────────
/**
 * Returns props for rendering a locked feature gate.
 * @param {string} tier - current vendor tier
 * @param {string} feature - feature key
 * @param {string} [status] - subscription status
 * @returns {{ locked: boolean, message: string, minTier: string|null }}
 */
export function useFeatureGate(tier, feature, status) {
    const locked = !vendorCanAccess(tier, feature, status)
    return {
        locked,
        message: locked ? upgradeMessage(feature) : '',
        minTier: minTierForFeature(feature),
    }
}

// ── Order limit checker ───────────────────────────────────────────────────────
/**
 * Check if vendor has exceeded their monthly order limit.
 * @param {string} tier
 * @param {number} currentMonthOrders
 * @param {string} [status] - subscription status
 * @returns {{ atLimit: boolean, limit: number, remaining: number }}
 */
export function checkOrderLimit(tier, currentMonthOrders, status) {
    const { ordersPerMonth } = getVendorLimits(tier, status)
    const atLimit = ordersPerMonth !== Infinity && currentMonthOrders >= ordersPerMonth
    const remaining = ordersPerMonth === Infinity
        ? Infinity
        : Math.max(0, ordersPerMonth - currentMonthOrders)
    return { atLimit, limit: ordersPerMonth, remaining }
}