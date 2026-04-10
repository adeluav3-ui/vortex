import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const VENDOR_PLANS = [
    {
        tier: 'solo',
        name: 'Solo',
        monthlyPrice: 4500,
        yearlyPrice: 45900,
        monthlyCode: 'PLN_ld2wkx75vf2owop',
        yearlyCode: 'PLN_liieyblqil0xgma',
        features: ['100 orders/month', '1 user account', 'Up to 50 products', 'Order management', 'Customer tracking', 'Logistics directory'],
        locked: ['Payment link generation', 'Delivery tracking', 'Full reports & export', 'Storefront link'],
    },
    {
        tier: 'hustle',
        name: 'Hustle',
        monthlyPrice: 9500,
        yearlyPrice: 96900,
        monthlyCode: 'PLN_7j4dvngdd7q1xcd',
        yearlyCode: 'PLN_1a7tboh8temcq9t',
        badge: 'Most Popular',
        features: ['500 orders/month', '2 user accounts', 'Unlimited products', 'Order management', 'Payment link generation', 'Delivery tracking'],
        locked: ['Full reports & export', 'Storefront link'],
    },
    {
        tier: 'scale',
        name: 'Scale',
        monthlyPrice: 18000,
        yearlyPrice: 183600,
        monthlyCode: 'PLN_oxtaphfdtb7tvth',
        yearlyCode: 'PLN_n3mxm6r1aaydvnd',
        badge: '⭐ Your Trial Plan',
        features: ['Unlimited orders', '5 user accounts', 'Unlimited products', 'Payment link generation', 'Delivery tracking', 'Full reports & export', 'Storefront link', 'Priority support'],
        locked: [],
    },
]

export default function TrialExpiredModal({ businessId, onSubscribed }) {
    const { user, fetchProfile } = useAuth()
    const [billingInterval, setBillingInterval] = useState('monthly')
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showLockWarning, setShowLockWarning] = useState(null) // plan tier being warned

    // Load Paystack
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.async = true
        document.body.appendChild(script)
        return () => document.body.removeChild(script)
    }, [])

    function handleSelectPlan(plan) {
        // If not Scale, show a lock warning first
        if (plan.tier !== 'scale' && plan.locked.length > 0) {
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
            },
            callback: async () => {
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
            },
        })

        handler.openIframe()
    }

    return (
        <>
            {/* Lock warning confirmation */}
            {showLockWarning && (
                <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 z-10">
                        <div className="text-center space-y-2">
                            <div className="text-3xl">🔒</div>
                            <h3 className="text-base font-bold text-gray-900">Some features will be locked</h3>
                            <p className="text-sm text-gray-500">
                                The <span className="font-semibold text-gray-700">{showLockWarning.name}</span> plan doesn't include everything you had during your trial. These features will be locked:
                            </p>
                        </div>
                        <ul className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-1.5">
                            {showLockWarning.locked.map(f => (
                                <li key={f} className="text-sm text-red-700 flex items-center gap-2">
                                    <span>✕</span> {f}
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs text-gray-400 text-center">
                            Any data you entered in these features is safe — it'll be accessible again if you upgrade later.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLockWarning(null)}
                                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
                            >
                                Go back
                            </button>
                            <button
                                onClick={confirmDowngrade}
                                className="flex-1 bg-gray-800 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-900 transition"
                            >
                                Continue with {showLockWarning.name}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main modal — non-dismissable */}
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden">

                    {/* Top banner */}
                    <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-5 text-center">
                        <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">Free Trial Ended</p>
                        <h2 className="text-xl font-bold text-white">Your 14-day trial has expired</h2>
                        <p className="text-sm text-blue-100 mt-1">
                            Choose a plan to keep using Vortex. Your data is safe and waiting.
                        </p>
                    </div>

                    <div className="p-6 space-y-6">

                        {/* Trial recap */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                            <span className="text-xl">💡</span>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                During your trial you had access to the <span className="font-semibold">Scale plan</span> — unlimited orders, full reports, storefront link, delivery tracking and more. If you loved the experience, we recommend staying on Scale.
                            </p>
                        </div>

                        {/* Billing toggle */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setBillingInterval('monthly')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingInterval === 'monthly'
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingInterval('yearly')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingInterval === 'yearly'
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Yearly
                                <span className="ml-2 text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">
                                    15% off
                                </span>
                            </button>
                        </div>

                        {/* Plan cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {VENDOR_PLANS.map(plan => {
                                const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
                                const monthlyEquiv = billingInterval === 'yearly'
                                    ? Math.round(plan.yearlyPrice / 12).toLocaleString()
                                    : null
                                const isSelected = selectedPlan?.tier === plan.tier
                                const isScale = plan.tier === 'scale'

                                return (
                                    <button
                                        key={plan.tier}
                                        onClick={() => handleSelectPlan(plan)}
                                        className={`border-2 rounded-xl p-4 text-left transition relative ${isSelected
                                            ? 'border-blue-600 bg-blue-50'
                                            : isScale
                                                ? 'border-indigo-300 bg-indigo-50/40 hover:border-blue-400'
                                                : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        {plan.badge && (
                                            <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${isScale ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                {plan.badge}
                                            </span>
                                        )}
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold text-gray-900">{plan.name}</h3>
                                            {isSelected && <span className="text-blue-600 text-lg">✓</span>}
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">
                                            ₦{price.toLocaleString()}
                                            <span className="text-xs font-normal text-gray-400">/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                                        </p>
                                        {monthlyEquiv && (
                                            <p className="text-xs text-green-600 mb-2">₦{monthlyEquiv}/mo</p>
                                        )}
                                        <ul className="mt-2 space-y-1">
                                            {plan.features.map(f => (
                                                <li key={f} className="text-xs text-gray-500 flex items-start gap-1">
                                                    <span className="text-green-500 shrink-0">✓</span> {f}
                                                </li>
                                            ))}
                                            {plan.locked.length > 0 && plan.locked.map(f => (
                                                <li key={f} className="text-xs text-gray-300 flex items-start gap-1 line-through">
                                                    <span className="shrink-0">✕</span> {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </button>
                                )
                            })}
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={handlePayment}
                            disabled={loading || !selectedPlan}
                            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? 'Processing...'
                                : selectedPlan
                                    ? `Subscribe to ${selectedPlan.name} — ₦${(billingInterval === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice).toLocaleString()}/${billingInterval === 'yearly' ? 'yr' : 'mo'}`
                                    : 'Select a plan to continue'
                            }
                        </button>

                        <p className="text-xs text-center text-gray-400">
                            Secure payment via Paystack · Cancel anytime · Your data is always yours
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}