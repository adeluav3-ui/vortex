/**
 * TrialBanner
 * 
 * Shown at the top of the dashboard during an active trial.
 * Disappears once they subscribe.
 */
import { useAuth } from '../../context/AuthContext'

export default function TrialBanner({ daysLeft }) {
    const { profile } = useAuth()
    const isUrgent = daysLeft <= 3

    const mode = profile?.businesses?.mode
    const tier = profile?.subscription?.tier

    // Determine the plan name to show in the banner
    let planName = 'Scale' // default for vendors

    if (mode === 'retail') {
        if (tier === 'starter') planName = 'Starter'
        else if (tier === 'growth') planName = 'Growth'
        else if (tier === 'business') planName = 'Business'
        else planName = 'Business' // default for retail trial
    } else if (mode === 'combo') {
        if (tier === 'combo_basic') planName = 'Basic'
        else if (tier === 'combo_standard') planName = 'Standard'
        else if (tier === 'combo_premium') planName = 'Premium'
        else planName = 'Premium' // default for combo trial
    } else if (mode === 'online_vendor') {
        if (tier === 'solo') planName = 'Solo'
        else if (tier === 'hustle') planName = 'Hustle'
        else if (tier === 'scale') planName = 'Scale'
        else planName = 'Scale' // default for vendor trial
    }

    return (
        <div className={`w-full px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium
            ${isUrgent
                ? 'bg-red-500 text-white'
                : 'bg-amber-400 text-amber-900'
            }`}
        >
            <span>{isUrgent ? '⚠️' : '🎁'}</span>
            <span>
                {isUrgent
                    ? `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — subscribe now to keep your access.`
                    : `Free trial active · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining on your ${planName} plan.`
                }
            </span>
            {isUrgent && (
                <a
                    href="/settings/billing"
                    className="underline font-semibold hover:opacity-80 transition"
                >
                    Subscribe now →
                </a>
            )}
        </div>
    )
}