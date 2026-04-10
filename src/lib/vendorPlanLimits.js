
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

    // Hustle and above
    paymentsPage: { solo: false, hustle: true, scale: true },
    deliveryTracker: { solo: false, hustle: true, scale: true },
    ordersBySource: { solo: false, hustle: true, scale: true },

    // Scale only
    storefront: { solo: false, hustle: false, scale: true },
    csvExport: { solo: false, hustle: false, scale: true },
    fullReports: { solo: false, hustle: false, scale: true },
}

/**
 * Get numeric limits for a vendor plan tier.
 * @param {string} tier - 'solo' | 'hustle' | 'scale'
 * @returns {Object} limits object
 */
export function getVendorLimits(tier) {
    return VENDOR_PLAN_LIMITS[tier] ?? VENDOR_PLAN_LIMITS.solo
}

/**
 * Check if a vendor plan tier can access a specific feature.
 * @param {string} tier - 'solo' | 'hustle' | 'scale'
 * @param {string} feature - feature key from VENDOR_FEATURES
 * @returns {boolean}
 */
export function vendorCanAccess(tier, feature) {
    const featureMap = VENDOR_FEATURES[feature]
    if (!featureMap) return false
    return featureMap[tier] ?? false
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
 * Use in components to show upgrade prompts consistently.
 *
 * @param {string} tier - current vendor tier
 * @param {string} feature - feature key
 * @returns {{ locked: boolean, message: string, minTier: string|null }}
 */
export function useFeatureGate(tier, feature) {
    const locked = !vendorCanAccess(tier, feature)
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
 * @param {number} currentMonthOrders - how many orders placed this month
 * @returns {{ atLimit: boolean, limit: number, remaining: number }}
 */
export function checkOrderLimit(tier, currentMonthOrders) {
    const { ordersPerMonth } = getVendorLimits(tier)
    const atLimit = ordersPerMonth !== Infinity && currentMonthOrders >= ordersPerMonth
    const remaining = ordersPerMonth === Infinity
        ? Infinity
        : Math.max(0, ordersPerMonth - currentMonthOrders)
    return { atLimit, limit: ordersPerMonth, remaining }
}