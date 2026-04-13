export const PLAN_LIMITS = {
    starter: {
        branches: 1,
        staff: 2,
        products: 50,
        reports: false,
        stockTransfers: false,
        auditLogs: false,
    },
    growth: {
        branches: 3,
        staff: 15,
        products: 200,
        reports: true,
        stockTransfers: true,
        auditLogs: false,
    },
    business: {
        branches: Infinity,
        staff: Infinity,
        products: Infinity,
        reports: true,
        stockTransfers: true,
        auditLogs: true,
    },
    combo_basic: {
        branches: 1,
        staff: 2,
        products: 50,
        reports: false,
        stockTransfers: false,
        auditLogs: false,
    },
    combo_standard: {
        branches: 3,
        staff: 15,
        products: 200,
        reports: true,
        stockTransfers: true,
        auditLogs: false,
    },
    combo_premium: {
        branches: Infinity,
        staff: Infinity,
        products: Infinity,
        reports: true,
        stockTransfers: true,
        auditLogs: true,
    },
}

export function getPlanLimits(tier) {
    return PLAN_LIMITS[tier] ?? PLAN_LIMITS.starter
}

export function canAccess(tier, feature) {
    return getPlanLimits(tier)[feature] ?? false
}