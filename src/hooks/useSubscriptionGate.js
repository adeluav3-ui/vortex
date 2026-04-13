// src/hooks/useSubscriptionGate.js
import { useAuth } from '../context/AuthContext'

const BLOCKED_STATUSES = ['inactive', 'cancelled', 'past_due']

export function useSubscriptionGate() {
    const { profile } = useAuth()

    const subscription = profile?.subscription
    const isBlocked = subscription && BLOCKED_STATUSES.includes(subscription.status)
    const isTrialing = subscription?.status === 'trialing'

    return {
        isBlocked,
        isTrialing,
        subscription,
        isActive: !isBlocked && !isTrialing,
    }
}