import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const VENDOR_PLANS = [
    {
        tier: 'solo',
        name: 'Solo',
        monthlyPrice: 4500,
        yearlyPrice: 45900,
        monthlyCode: 'PLN_1dmcxfs006gtl6m',
        yearlyCode: 'PLN_vp08jxmaekii6m8',
        features: ['100 orders/month', '1 user account', 'Up to 50 products', 'Order management', 'Customer tracking', 'Logistics directory'],
        locked: ['Payment link generation', 'Delivery tracking', 'Full reports & export', 'Storefront link'],
    },
    {
        tier: 'hustle',
        name: 'Hustle',
        monthlyPrice: 9500,
        yearlyPrice: 96900,
        monthlyCode: 'PLN_jgfdsznt7qu4bwm',
        yearlyCode: 'PLN_vz2eh4f9jvwr0dv',
        badge: 'Most Popular',
        features: ['500 orders/month', '2 user accounts', 'Unlimited products', 'Order management', 'Payment link generation', 'Delivery tracking'],
        locked: ['Full reports & export', 'Storefront link'],
    },
    {
        tier: 'scale',
        name: 'Scale',
        monthlyPrice: 18000,
        yearlyPrice: 183600,
        monthlyCode: 'PLN_zg2ndbq2x36flcx',
        yearlyCode: 'PLN_izrkgoyv88a1pss',
        badge: '⭐ Your Trial Plan',
        features: ['Unlimited orders', '5 user accounts', 'Unlimited products', 'Payment link generation', 'Delivery tracking', 'Full reports & export', 'Storefront link', 'Priority support'],
        locked: [],
    },
]

// ─── Retail Plans (for trial expiry) ─────────────────────────────────────────
const RETAIL_PLANS_TRIAL = [
    {
        tier: 'starter',
        name: 'Starter',
        monthlyPrice: 8000,
        yearlyPrice: 81600,
        monthlyCode: 'PLN_grze6zv0gkw5euw',
        yearlyCode: 'PLN_jz65z74pi7nvbxy',
        features: ['1 branch', '2 staff accounts', 'Up to 50 products', 'POS + Sales', 'Inventory', 'Expenses'],
        locked: ['Full Reports', 'Audit logs', 'Unlimited products'],
    },
    {
        tier: 'growth',
        name: 'Growth',
        monthlyPrice: 15000,
        yearlyPrice: 153000,
        monthlyCode: 'PLN_2bym17e1gqq9a68',
        yearlyCode: 'PLN_jvas4v10w9qx92w',
        badge: 'Most Popular',
        features: ['Up to 3 branches', '15 staff accounts', 'Up to 200 products', 'Full Reports', 'Stock transfers'],
        locked: ['Audit logs', 'Unlimited products'],
    },
    {
        tier: 'business',
        name: 'Business',
        monthlyPrice: 25000,
        yearlyPrice: 255000,
        monthlyCode: 'PLN_a2mnjvi7wom1oeu',
        yearlyCode: 'PLN_j8xvl1sr93ufrmr',
        badge: '⭐ Your Trial Plan',
        features: ['Unlimited branches', 'Unlimited staff', 'Unlimited products', 'Full Reports', 'Audit logs', 'Priority support'],
        locked: [],
    },
]

// ─── Combo Plans (for trial expiry) ─────────────────────────────────────────
const COMBO_PLANS_TRIAL = [
    {
        tier: 'combo_basic',
        name: 'Basic',
        monthlyPrice: 12500,
        yearlyPrice: 127500,
        monthlyCode: 'PLN_hlm3uftf4cpg8bb',
        yearlyCode: 'PLN_urqq1jm9sm43nbn',
        features: ['1 branch', '2 staff', '50 products', '100 orders', 'POS + Orders', 'Inventory', 'Customers', 'Expenses'],
        locked: ['Full Reports', 'Stock transfers', 'Payment tracking', 'Audit logs', 'Storefront'],
    },
    {
        tier: 'combo_standard',
        name: 'Standard',
        monthlyPrice: 24500,
        yearlyPrice: 249900,
        monthlyCode: 'PLN_94h10u6wc2bh9eb',
        yearlyCode: 'PLN_woec9ujwshc6fh5',
        badge: 'Most Popular',
        features: ['3 branches', '15 staff', '200 products', '500 orders', 'Full Reports', 'Stock transfers', 'Payment tracking'],
        locked: ['Audit logs', 'Storefront'],
    },
    {
        tier: 'combo_premium',
        name: 'Premium',
        monthlyPrice: 43000,
        yearlyPrice: 438600,
        monthlyCode: 'PLN_020qaqdryasz5ma',
        yearlyCode: 'PLN_wh4ia00b29ve9db',
        badge: '⭐ Your Trial Plan',
        features: ['Unlimited branches', 'Unlimited staff', 'Unlimited products', 'Unlimited orders', 'Audit logs', 'Storefront', 'Priority support'],
        locked: [],
    },
]

export default function TrialExpiredModal({ businessId, businessMode, onSubscribed }) {
    const { user, fetchProfile } = useAuth()
    const [billingInterval, setBillingInterval] = useState('monthly')
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showLockWarning, setShowLockWarning] = useState(null)

    // Determine which plans to show based on business mode
    let ACTIVE_PLANS = []
    let trialDays = 7
    let trialTopPlan = 'Business'

    if (businessMode === 'online_vendor') {
        ACTIVE_PLANS = VENDOR_PLANS
        trialDays = 14
        trialTopPlan = 'Scale'
    } else if (businessMode === 'combo') {
        ACTIVE_PLANS = COMBO_PLANS_TRIAL
        trialDays = 7
        trialTopPlan = 'Premium'
    } else {
        // retail mode
        ACTIVE_PLANS = RETAIL_PLANS_TRIAL
        trialDays = 7
        trialTopPlan = 'Business'
    }

    // Load Paystack
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.async = true
        document.body.appendChild(script)
        return () => document.body.removeChild(script)
    }, [])

    function handleSelectPlan(plan) {
        // If not the top plan, show lock warning first
        if (plan.locked.length > 0) {
            setShowLockWarning(plan)
        } else {
            setSelectedPlan(plan)
            setShowLockWarning(null)
        }
    }

    function confirmDowngrade() {
        setSelectedPlan(showLockWarning)
        setShowLockWarning(null)
    }

    async function handlePayment() {
        if (!selectedPlan) return setError('Please select a plan to continue.')
        setError('')
        setLoading(true)

        const planCode = billingInterval === 'yearly'
            ? selectedPlan.yearlyCode
            : selectedPlan.monthlyCode

        const amount = billingInterval === 'yearly'
            ? selectedPlan.yearlyPrice
            : selectedPlan.monthlyPrice

        setLoading(false)

        const handler = window.PaystackPop.setup({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
            email: user.email,
            amount: amount * 100,
            plan: planCode,
            currency: 'NGN',
            channels: ['card'],
            ref: `VTX-TRIAL-${businessId.slice(0, 8)}-${Date.now()}`,
            metadata: {
                business_id: businessId,
                tier: selectedPlan.tier,
                interval: billingInterval,
                from_trial: true,
            },
            onClose: () => {
                setError('Payment was cancelled. Please complete payment to continue using Vortex.')
                setLoading(false)
            },
            callback: function () {
                async function onSuccess() {
                    await supabase
                        .from('subscriptions')
                        .update({
                            status: 'active',
                            tier: selectedPlan.tier,
                            is_trial: false,
                            trial_start: null,
                            trial_end: null,
                        })
                        .eq('business_id', businessId)

                    await fetchProfile(user.id)
                    onSubscribed?.()
                }
                onSuccess()
            },
        })

        handler.openIframe()
    }

    return (
        <>
            {/* Lock warning confirmation - Mobile optimized */}
            {showLockWarning && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-5 space-y-4 z-10 max-h-[90vh] overflow-y-auto">
                        <div className="text-center space-y-2">
                            <div className="text-4xl">🔒</div>
                            <h3 className="text-lg font-bold text-gray-900">Some features will be locked</h3>
                            <p className="text-sm text-gray-500">
                                The <span className="font-semibold text-gray-700">{showLockWarning.name}</span> plan doesn't include everything you had during your trial.
                            </p>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-1.5">
                            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Locked features:</p>
                            {showLockWarning.locked.map(f => (
                                <li key={f} className="text-sm text-red-700 flex items-center gap-2">
                                    <span>✕</span> {f}
                                </li>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 text-center">
                            Your data is safe — it'll be accessible again if you upgrade later.
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                            <button
                                onClick={() => setShowLockWarning(null)}
                                className="w-full sm:flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition active:scale-[0.98]"
                            >
                                Go back
                            </button>
                            <button
                                onClick={confirmDowngrade}
                                className="w-full sm:flex-1 bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-900 transition active:scale-[0.98]"
                            >
                                Continue with {showLockWarning.name}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main modal — Mobile optimized, non-dismissable */}
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 overflow-y-auto">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 max-h-[95vh] overflow-y-auto">

                    {/* Top banner - Mobile friendly */}
                    <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-5 sm:px-6 sm:py-5 text-center sticky top-0">
                        <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">Free Trial Ended</p>
                        <h2 className="text-lg sm:text-xl font-bold text-white">Your {trialDays}-day trial has expired</h2>
                        <p className="text-xs sm:text-sm text-blue-100 mt-1 px-2">
                            Choose a plan to keep using Vortex. Your data is safe.
                        </p>
                    </div>

                    <div className="p-5 sm:p-6 space-y-5">

                        {/* Trial recap - Mobile optimized */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 sm:px-4 flex items-start gap-2 sm:gap-3">
                            <span className="text-xl shrink-0">💡</span>
                            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                                During your trial you had access to the <span className="font-semibold">{trialTopPlan} plan</span> — the full feature set. We recommend staying on {trialTopPlan}.
                            </p>
                        </div>

                        {/* Billing toggle - Mobile friendly */}
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                            <button
                                onClick={() => setBillingInterval('monthly')}
                                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98] ${billingInterval === 'monthly'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingInterval('yearly')}
                                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98] ${billingInterval === 'yearly'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Yearly
                                <span className="ml-1 sm:ml-2 text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">
                                    15% off
                                </span>
                            </button>
                        </div>

                        {/* Plan cards - Mobile optimized (vertical scroll on mobile) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-[40vh] sm:max-h-none overflow-y-auto sm:overflow-visible px-0.5">
                            {ACTIVE_PLANS.map(plan => {
                                const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
                                const monthlyEquiv = billingInterval === 'yearly'
                                    ? Math.round(plan.yearlyPrice / 12).toLocaleString()
                                    : null
                                const isSelected = selectedPlan?.tier === plan.tier
                                const isTopPlan = plan.locked.length === 0

                                return (
                                    <button
                                        key={plan.tier}
                                        onClick={() => handleSelectPlan(plan)}
                                        className={`border-2 rounded-xl p-4 text-left transition-all relative active:scale-[0.98] ${isSelected
                                            ? 'border-blue-600 bg-blue-50 shadow-md'
                                            : isTopPlan
                                                ? 'border-indigo-300 bg-indigo-50/40 hover:border-blue-400'
                                                : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        {plan.badge && (
                                            <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${isTopPlan ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                {plan.badge}
                                            </span>
                                        )}
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-base sm:text-sm font-bold text-gray-900">{plan.name}</h3>
                                            {isSelected && <span className="text-blue-600 text-lg ml-2">✓</span>}
                                        </div>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            ₦{price.toLocaleString()}
                                            <span className="text-xs font-normal text-gray-400">/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                                        </p>
                                        {monthlyEquiv && (
                                            <p className="text-xs text-green-600 mb-2">₦{monthlyEquiv}/mo</p>
                                        )}
                                        <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                                            {plan.features.slice(0, 4).map(f => (
                                                <li key={f} className="text-xs text-gray-600 flex items-start gap-1">
                                                    <span className="text-green-500 shrink-0">✓</span>
                                                    <span className="break-words">{f}</span>
                                                </li>
                                            ))}
                                            {plan.features.length > 4 && (
                                                <li className="text-xs text-gray-400 pl-4">+{plan.features.length - 4} more</li>
                                            )}
                                            {plan.locked.length > 0 && plan.locked.slice(0, 2).map(f => (
                                                <li key={f} className="text-xs text-gray-300 flex items-start gap-1 line-through">
                                                    <span className="shrink-0">✕</span>
                                                    <span className="break-words">{f}</span>
                                                </li>
                                            ))}
                                            {plan.locked.length > 2 && (
                                                <li className="text-xs text-gray-300 pl-4">+{plan.locked.length - 2} locked</li>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* CTA - Mobile optimized */}
                        <button
                            onClick={handlePayment}
                            disabled={loading || !selectedPlan}
                            className="w-full bg-blue-600 text-white rounded-xl py-3.5 sm:py-3 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-[0.98]"
                        >
                            {loading
                                ? 'Processing...'
                                : selectedPlan
                                    ? `Subscribe to ${selectedPlan.name} — ₦${(billingInterval === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice).toLocaleString()}/${billingInterval === 'yearly' ? 'yr' : 'mo'}`
                                    : 'Select a plan to continue'
                            }
                        </button>

                        <p className="text-xs text-center text-gray-400 px-2">
                            🔒 Secure payment via Paystack · Cancel anytime · Your data is always yours
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}