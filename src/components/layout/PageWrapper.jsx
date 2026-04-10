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