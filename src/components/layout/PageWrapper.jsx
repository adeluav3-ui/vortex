import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'
import { useTrialStatus } from '../../hooks/useTrialStatus'
import TrialBanner from './TrialBanner'
import TrialExpiredModal from './TrialExpiredModal'

export default function PageWrapper({ title, children }) {
    const { profile } = useAuth()
    const isVendor = profile?.businesses?.mode === 'online_vendor'

    const { isTrialExpired, isTrialing, daysLeft, refetch } = useTrialStatus(
        isVendor ? profile?.business_id : null
    )

    // Show payment required banner for inactive subscriptions
    const isInactive = profile?.subscription?.status === 'inactive'

    {
        isInactive && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <p className="text-sm text-red-700 font-medium">
                        Your subscription is inactive. Complete payment to access all features.
                    </p>
                </div>
                <a href="/settings/billing" className="text-xs text-red-700 font-semibold underline shrink-0 ml-3">
                    Pay Now →
                </a>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Trial states */}
            {isTrialing && <TrialBanner daysLeft={daysLeft} />}
            {isTrialExpired && (
                <TrialExpiredModal
                    businessId={profile?.business_id}
                    onSubscribed={refetch}
                />
            )}

            <Sidebar />

            <div className="md:ml-60 flex flex-col min-h-screen">
                <Navbar title={title} />
                <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
                    {children}
                </main>
            </div>

            {/* Bottom nav — retail only on mobile
                Vendors use the sidebar drawer instead */}
            {!isVendor && <BottomNav />}
        </div>
    )
}