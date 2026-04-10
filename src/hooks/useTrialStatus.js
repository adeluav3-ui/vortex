import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useTrialStatus
 * 
 * Returns trial state for the current business.
 * Call this in your top-level layout (e.g. DashboardLayout).
 * 
 * @param {string|null} businessId
 * @returns {{ isTrialExpired: boolean, isTrialing: boolean, daysLeft: number|null, refetch: Function }}
 */
export function useTrialStatus(businessId) {
    const [isTrialExpired, setIsTrialExpired] = useState(false)
    const [isTrialing, setIsTrialing] = useState(false)
    const [daysLeft, setDaysLeft] = useState(null)

    async function checkTrial() {
        if (!businessId) return

        const { data, error } = await supabase
            .from('subscriptions')
            .select('status, is_trial, trial_end')
            .eq('business_id', businessId)
            .single()

        if (error || !data) return

        if (data.is_trial && data.status === 'trialing') {
            const now = new Date()
            const end = new Date(data.trial_end)
            const msLeft = end - now

            if (msLeft <= 0) {
                // Trial has expired
                setIsTrialExpired(true)
                setIsTrialing(false)
                setDaysLeft(0)
            } else {
                // Still in trial
                setIsTrialing(true)
                setIsTrialExpired(false)
                setDaysLeft(Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
            }
        } else {
            setIsTrialing(false)
            setIsTrialExpired(false)
            setDaysLeft(null)
        }
    }

    useEffect(() => {
        checkTrial()
    }, [businessId])

    return { isTrialExpired, isTrialing, daysLeft, refetch: checkTrial }
}