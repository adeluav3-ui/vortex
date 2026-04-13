// src/components/layout/PageWrapper.jsx
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'
import { useTrialStatus } from '../../hooks/useTrialStatus'
import TrialBanner from './TrialBanner'
import TrialExpiredModal from './TrialExpiredModal'
import SubscriptionBlockedModal from './SubscriptionBlockedModal'

const BLOCKED_STATUSES = ['inactive', 'cancelled', 'past_due']

export default function PageWrapper({ title, children }) {
    const { profile, fetchProfile } = useAuth()

    const businessMode = profile?.businesses?.mode
    const isVendor = businessMode === 'online_vendor'
    const subStatus = profile?.subscription?.status
    const subTier = profile?.subscription?.tier
    const businessId = profile?.business_id

    const { isTrialExpired, isTrialing, daysLeft, refetch } = useTrialStatus(
        businessId ?? null
    )

    const isBlocked = BLOCKED_STATUSES.includes(subStatus)
    const isTrialExpiredActive = isTrialExpired && subStatus === 'trialing'

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Trial banner — shown while trialing and not yet expired */}
            {isTrialing && !isTrialExpiredActive && (
                <TrialBanner daysLeft={daysLeft} />
            )}

            {/* Trial expired — full-screen block */}
            {isTrialExpiredActive && !isBlocked && (
                <TrialExpiredModal
                    businessId={businessId}
                    businessMode={businessMode}
                    onSubscribed={refetch}
                />
            )}

            {/* Subscription inactive / cancelled / past_due — full-screen block */}
            {isBlocked && (
                <SubscriptionBlockedModal
                    businessId={businessId}
                    businessMode={businessMode}
                    currentTier={subTier}
                    subStatus={subStatus}
                    onSubscribed={async () => {
                        await fetchProfile?.(profile?.id)
                        refetch?.()
                    }}
                />
            )}

            <Sidebar />

            <div className="md:ml-60 flex flex-col min-h-screen">
                <Navbar title={title} />
                <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
                    {children}
                </main>
            </div>

            {!isVendor && <BottomNav />}
        </div>
    )
}