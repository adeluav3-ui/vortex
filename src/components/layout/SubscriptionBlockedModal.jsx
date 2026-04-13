// src/components/layout/SubscriptionBlockedModal.jsx
import { useNavigate } from 'react-router-dom'

const TIER_PRICES = {
    starter: 8000,
    growth: 15000,
    business: 25000,
    solo: 4500,
    hustle: 9500,
    scale: 18000,
    combo_basic: 12500,
    combo_standard: 24500,
    combo_premium: 43000,
}

export default function SubscriptionBlockedModal({ businessId, businessMode, currentTier, subStatus, onSubscribed }) {
    const navigate = useNavigate()

    const isVendor = businessMode === 'online_vendor'
    const price = TIER_PRICES[currentTier] || 8000

    const getMessage = () => {
        if (subStatus === 'past_due') {
            return "Your recent payment failed. Please update your payment method to continue using Vortex."
        }
        if (subStatus === 'cancelled') {
            return "Your subscription has been cancelled. Choose a plan to regain access to your account."
        }
        return "Your subscription is no longer active. Choose a plan to continue using Vortex."
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
                {/* Top banner */}
                <div className="bg-linear-to-r from-red-600 to-orange-600 px-6 py-5 text-center">
                    <div className="text-4xl mb-2">🔒</div>
                    <h2 className="text-xl font-bold text-white">Access Restricted</h2>
                    <p className="text-sm text-red-100 mt-1">
                        {subStatus === 'past_due' ? 'Payment Failed' : 'Subscription Inactive'}
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 text-center">
                        {getMessage()}
                    </p>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Previous Plan</span>
                            <span className="font-medium capitalize">{currentTier?.replace('_', ' ') || 'No plan'}</span>
                        </div>
                        {subStatus === 'past_due' && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Amount Due</span>
                                <span className="font-medium text-red-600">₦{price.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/settings/billing')}
                        className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 transition"
                    >
                        {subStatus === 'past_due' ? 'Update Payment Method' : 'View Plans'}
                    </button>

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full text-gray-400 text-sm hover:text-gray-600 transition"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    )
}