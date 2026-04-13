import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

// ─── Retail Plans ─────────────────────────────────────────────────────────────
const RETAIL_PLANS = [
    {
        tier: 'starter',
        name: 'Starter',
        monthlyPrice: 8000,
        yearlyPrice: 81600,
        monthlyCode: 'PLN_grze6zv0gkw5euw',
        yearlyCode: 'PLN_jz65z74pi7nvbxy',
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
        monthlyCode: 'PLN_2bym17e1gqq9a68',
        yearlyCode: 'PLN_jvas4v10w9qx92w',
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
        monthlyCode: 'PLN_a2mnjvi7wom1oeu',
        yearlyCode: 'PLN_j8xvl1sr93ufrmr',
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

// ─── Vendor Plans ─────────────────────────────────────────────────────────────
const VENDOR_PLANS = [
    {
        tier: 'solo',
        name: 'Solo',
        monthlyPrice: 4500,
        yearlyPrice: 45900,
        monthlyCode: 'PLN_1dmcxfs006gtl6m',
        yearlyCode: 'PLN_vp08jxmaekii6m8',
        color: 'border-gray-200',
        badge: '',
        features: [
            '100 orders/month',
            '1 user account',
            'Up to 50 products',
            'Order management',
            'Customer tracking',
            'Logistics directory',
        ],
    },
    {
        tier: 'hustle',
        name: 'Hustle',
        monthlyPrice: 9500,
        yearlyPrice: 96900,
        monthlyCode: 'PLN_jgfdsznt7qu4bwm',
        yearlyCode: 'PLN_vz2eh4f9jvwr0dv',
        color: 'border-blue-400',
        badge: 'Most Popular',
        features: [
            '500 orders/month',
            '2 user accounts',
            'Unlimited products',
            'Everything in Solo',
            'Payment tracking',
            'Delivery tracking',
        ],
    },
    {
        tier: 'scale',
        name: 'Scale',
        monthlyPrice: 18000,
        yearlyPrice: 183600,
        monthlyCode: 'PLN_zg2ndbq2x36flcx',
        yearlyCode: 'PLN_izrkgoyv88a1pss',
        color: 'border-purple-400',
        badge: 'Best Value',
        features: [
            'Unlimited orders',
            '5 user accounts',
            'Unlimited products',
            'Everything in Hustle',
            'Full reports & export',
            'Storefront link',
            'Priority support',
        ],
    },
]

// ─── Combo Plans ──────────────────────────────────────────────────────────────
const COMBO_PLANS = [
    {
        tier: 'combo_basic',
        name: 'Basic',
        monthlyPrice: 12500,
        yearlyPrice: 127500,
        monthlyCode: 'PLN_hlm3uftf4cpg8bb',
        yearlyCode: 'PLN_urqq1jm9sm43nbn',
        color: 'border-gray-200',
        badge: '',
        features: [
            '1 branch',
            '2 staff accounts',
            'Up to 50 products',
            '100 orders/month',
            'Sales / POS + Order management',
            'Inventory + Customers',
            'Expenses + Logistics directory',
        ],
    },
    {
        tier: 'combo_standard',
        name: 'Standard',
        monthlyPrice: 24500,
        yearlyPrice: 249900,
        monthlyCode: 'PLN_94h10u6wc2bh9eb',
        yearlyCode: 'PLN_woec9ujwshc6fh5',
        color: 'border-blue-400',
        badge: 'Most Popular',
        features: [
            'Up to 3 branches',
            '15 staff accounts',
            'Up to 200 products',
            '500 orders/month',
            'Full Reports',
            'Stock transfers',
            'Payment tracking + Delivery tracking',
        ],
    },
    {
        tier: 'combo_premium',
        name: 'Premium',
        monthlyPrice: 43000,
        yearlyPrice: 438600,
        monthlyCode: 'PLN_020qaqdryasz5ma',
        yearlyCode: 'PLN_wh4ia00b29ve9db',
        color: 'border-purple-400',
        badge: 'Best Value',
        features: [
            'Unlimited branches',
            'Unlimited staff',
            'Unlimited products',
            'Unlimited orders',
            'Audit logs',
            'Storefront link',
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

    const mode = profile?.businesses?.mode
    const currentTier = subscription?.tier ?? 'starter'
    // Determine which plans to show based on business mode
    let displayPlans = RETAIL_PLANS
    if (mode === 'online_vendor') {
        displayPlans = VENDOR_PLANS
    } else if (mode === 'combo') {
        displayPlans = COMBO_PLANS
    }

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
                            <span className="text-2xl font-bold text-gray-900 capitalize">
                                {currentTier === 'combo_basic' ? 'Basic' :
                                    currentTier === 'combo_standard' ? 'Standard' :
                                        currentTier === 'combo_premium' ? 'Premium' :
                                            currentTier}
                            </span>
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
                {displayPlans.map(plan => {
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