/**
 * useAuditLog
 *
 * Hook for writing audit log entries. Call anywhere an auditable
 * action happens. Only writes if the business is on the Business plan.
 *
 * Usage:
 *   const { log } = useAuditLog()
 *   await log('sale.created', 'Sale #SL-00123', { total: 5000, items: 3 })
 *
 * Action naming convention: entity.verb
 *   sale.created, sale.voided
 *   product.created, product.updated, product.deleted
 *   staff.invited, staff.removed
 *   expense.created
 *   stock.transferred
 *   settings.updated
 *   subscription.changed
 */

import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useAuditLog() {
    const { profile } = useAuth()

    const tier = profile?.businesses?.subscription_tier ?? 'starter'
    const canAudit = tier === 'business'

    async function log(action, entity = null, meta = null) {
        // Only log for Business plan
        if (!canAudit) return
        if (!profile?.business_id) return

        try {
            await supabase.from('audit_logs').insert({
                business_id: profile.business_id,
                user_id: profile.id,
                user_name: profile.full_name ?? 'Unknown',
                action,
                entity,
                meta,
            })
        } catch (err) {
            // Audit log failure should never break the main action
            console.warn('Audit log failed:', err.message)
        }
    }

    return { log, canAudit }
}   