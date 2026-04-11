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
}

// ── Feature access map ────────────────────────────────────────────────────────
// true = feature available on that tier
const VENDOR_FEATURES = {
    // Available to all tiers
    orders: { solo: true, hustle: true, scale: true },
    inventory: { solo: true, hustle: true, scale: true },
    customers: { solo: true, hustle: true, scale: true },
    logisticsDirectory: { solo: true, hustle: true, scale: true },
    invoices: { solo: true, hustle: true, scale: true },
    importData: { solo: true, hustle: true, scale: true },

    // Hustle and above
    paymentsPage: { solo: false, hustle: true, scale: true },
    deliveryTracker: { solo: false, hustle: true, scale: true },
    ordersBySource: { solo: false, hustle: true, scale: true },
    reports: { solo: false, hustle: true, scale: true },
    fullReports: { solo: false, hustle: true, scale: true },

    // Scale only
    storefront: { solo: false, hustle: false, scale: true },
    csvExport: { solo: false, hustle: false, scale: true },
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
 * @returns {'solo'|'hustle'|'scale'}
 */
export function getEffectiveTier(tier, status) {
    // Trialing = full Scale access always
    if (status === 'trialing') return 'scale'
    // Known tiers pass through
    if (tier === 'solo' || tier === 'hustle' || tier === 'scale') return tier
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
 * @returns {'solo'|'hustle'|'scale'|null}
 */
export function minTierForFeature(feature) {
    const featureMap = VENDOR_FEATURES[feature]
    if (!featureMap) return null
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
    const labels = { hustle: 'Hustle', scale: 'Scale' }
    if (!min || min === 'solo') return ''
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