import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

const PLANS = [
    {
        tier: 'starter',
        name: 'Starter',
        monthlyPrice: 8000,
        yearlyPrice: 81600,
        monthlyCode: 'PLN_vgfmc26jpqa56dj',
        yearlyCode: 'PLN_qo34f4txuqa2iny',
        color: 'border-gray-200',
        badge: '',
        features: [
            '1 branch',
            '2 staff accounts',
            'Up to 50 products',
            'Sales / POS',
            'Inventory',
            'Expenses',
            'Customers',
        ],
    },
    {
        tier: 'growth',
        name: 'Growth',
        monthlyPrice: 15000,
        yearlyPrice: 153000,
        monthlyCode: 'PLN_oh48az761gii1ac',
        yearlyCode: 'PLN_i1jl355wen3da47',
        color: 'border-blue-400',
        badge: 'Most Popular',
        features: [
            'Up to 3 branches',
            '15 staff accounts',
            'Up to 200 products',
            'Everything in Starter',
            'Full Reports',
            'Stock transfers',
        ],
    },
    {
        tier: 'business',
        name: 'Business',
        monthlyPrice: 25000,
        yearlyPrice: 255000,
        monthlyCode: 'PLN_rzmdyt42wkb1bxp',
        yearlyCode: 'PLN_wy53l0wv0jewfyu',
        color: 'border-purple-400',
        badge: 'Best Value',
        features: [
            'Unlimited branches',
            'Unlimited staff',
            'Unlimited products',
            'Everything in Growth',
            'Audit logs',
            'Priority support',
        ],
    },
]

export default function Billing() {
    const { profile, user, fetchProfile } = useAuth()
    const [billingInterval, setBillingInterval] = useState('monthly')
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)
    const [processingTier, setProcessingTier] = useState(null)

    const currentTier = subscription?.tier ?? 'starter'

    useEffect(() => {
        fetchSubscription()
    }, [])

    // Load Paystack inline script
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.async = true
        document.body.appendChild(script)
        return () => document.body.removeChild(script)
    }, [])

    async function fetchSubscription() {
        setLoading(true)
        const { data } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('business_id', profile.business_id)
            .single()
        setSubscription(data)
        setLoading(false)
    }

    function handleUpgrade(plan) {
        if (plan.tier === currentTier) return
        setProcessingTier(plan.tier)

        const planCode = billingInterval === 'yearly' ? plan.yearlyCode : plan.monthlyCode
        const amount = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice

        // FIXED: Use profile.business_id instead of result.business.id
        const transactionRef = `VTX-${profile.business_id.slice(0, 8)}-${Date.now()}`

        const handler = window.PaystackPop.setup({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
            email: user.email,
            amount: amount * 100,
            plan: planCode,
            currency: 'NGN',
            channels: ['card'],
            ref: transactionRef,
            metadata: {
                business_id: profile.business_id,
                tier: plan.tier,
                interval: billingInterval,
            },
            onClose: () => {
                setProcessingTier(null)
            },
            callback: (response) => {
                // Optimistically update subscription
                supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        tier: plan.tier,
                        paystack_subscription_code: response.reference || null
                    })
                    .eq('business_id', profile.business_id)
                    .then(() => fetchProfile(user.id))
                    .then(() => fetchSubscription())
                    .then(() => setProcessingTier(null))
                    .catch((err) => {
                        console.error('Error updating subscription:', err)
                        setProcessingTier(null)
                    })
            },
        })

        handler.openIframe()
    }

    const periodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('en-NG', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
        : null

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading billing...</div>

    return (
        <div className="max-w-4xl space-y-6">
            {/* Current plan summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Current Plan</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-gray-900 capitalize">{currentTier}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${subscription?.status === 'active'
                                    ? 'bg-green-50 text-green-600'
                                    : subscription?.status === 'trialing'
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-red-50 text-red-500'
                                }`}>
                                {subscription?.status === 'trialing' ? 'Trial' : subscription?.status ?? 'inactive'}
                            </span>
                        </div>
                        {periodEnd && (
                            <p className="text-xs text-gray-400 mt-1">
                                {subscription?.status === 'active'
                                    ? `Renews on ${periodEnd}`
                                    : subscription?.status === 'trialing'
                                        ? `Trial ends on ${periodEnd}`
                                        : `Expired on ${periodEnd}`}
                            </p>
                        )}
                    </div>
                    {subscription?.paystack_subscription_code && (
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Subscription Code</p>
                            <p className="text-xs font-mono text-gray-600">{subscription.paystack_subscription_code}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Interval toggle */}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PLANS.map(plan => {
                    const isCurrent = plan.tier === currentTier
                    const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
                    const monthlyEquiv = billingInterval === 'yearly'
                        ? Math.round(plan.yearlyPrice / 12).toLocaleString()
                        : null

                    return (
                        <div
                            key={plan.tier}
                            className={`bg-white rounded-xl border-2 shadow-sm p-5 flex flex-col relative ${isCurrent ? 'border-blue-500' : plan.color
                                }`}
                        >
                            {/* Badge */}
                            {plan.badge && !isCurrent && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                                    {plan.badge}
                                </span>
                            )}

                            {isCurrent && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-green-500 text-white px-3 py-1 rounded-full font-semibold">
                                    Current Plan
                                </span>
                            )}

                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                                <div className="mt-2">
                                    <span className="text-2xl font-bold text-gray-900">
                                        ₦{price.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        /{billingInterval === 'yearly' ? 'yr' : 'mo'}
                                    </span>
                                </div>
                                {monthlyEquiv && (
                                    <p className="text-xs text-green-600 font-medium mt-0.5">
                                        ₦{monthlyEquiv}/mo billed yearly
                                    </p>
                                )}
                            </div>

                            <ul className="space-y-2 flex-1 mb-5">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                                        <span className="text-green-500 mt-0.5">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleUpgrade(plan)}
                                disabled={isCurrent || processingTier === plan.tier}
                                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${isCurrent
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                                    }`}
                            >
                                {processingTier === plan.tier
                                    ? 'Processing...'
                                    : isCurrent
                                        ? 'Current Plan'
                                        : `Upgrade to ${plan.name}`}
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Note */}
            <p className="text-xs text-gray-400 text-center">
                Payments are processed securely by Paystack. Cancel anytime from your Paystack dashboard.
                Upgrades take effect immediately after payment.
            </p>
        </div>
    )
}