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

    const isInactive = profile?.subscription?.status === 'inactive'

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Trial states — vendor only */}
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

                    {/* Inactive subscription banner — shown when payment was skipped/failed */}
                    {isInactive && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2">
                                <span className="text-lg shrink-0">⚠️</span>
                                <div>
                                    <p className="text-sm font-semibold text-red-700">Your subscription is inactive</p>
                                    <p className="text-xs text-red-600 mt-0.5">
                                        Complete payment to activate your account and access all features.
                                    </p>
                                </div>
                            </div>
                            <a
                                href="/settings/billing"
                                className="shrink-0 text-xs bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition text-center"
                            >
                                Complete Payment →
                            </a>
                        </div>
                    )}

                    {children}
                </main>
            </div>

            {/* Bottom nav — retail only on mobile.
                Vendors use the sidebar drawer instead */}
            {!isVendor && <BottomNav />}
        </div>
    )
}