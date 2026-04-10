/**
 * TrialBanner
 * 
 * Shown at the top of the dashboard during an active trial.
 * Disappears once they subscribe.
 */
export default function TrialBanner({ daysLeft }) {
    const isUrgent = daysLeft <= 3

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
                    : `Free trial active · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining on your Scale plan.`
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