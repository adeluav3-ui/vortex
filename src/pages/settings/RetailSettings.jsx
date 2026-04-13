import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

const RETAIL_PLANS = [
    {
        tier: 'starter',
        name: 'Starter',
        monthlyPrice: 8000,
        yearlyPrice: 81600,
        monthlyCode: 'PLN_vgfmc26jpqa56dj',
        yearlyCode: 'PLN_qo34f4txuqa2iny',
        features: ['1 branch', '2 staff accounts', 'Up to 50 products', 'Sales / POS', 'Inventory', 'Expenses', 'Customers'],
    },
    {
        tier: 'growth',
        name: 'Growth',
        monthlyPrice: 15000,
        yearlyPrice: 153000,
        monthlyCode: 'PLN_oh48az761gii1ac',
        yearlyCode: 'PLN_i1jl355wen3da47',
        badge: 'Most Popular',
        features: ['Up to 3 branches', '15 staff accounts', 'Up to 200 products', 'Everything in Starter', 'Full Reports', 'Stock transfers'],
    },
    {
        tier: 'business',
        name: 'Business',
        monthlyPrice: 25000,
        yearlyPrice: 255000,
        monthlyCode: 'PLN_rzmdyt42wkb1bxp',
        yearlyCode: 'PLN_wy53l0wv0jewfyu',
        badge: 'Best Value',
        features: ['Unlimited branches', 'Unlimited staff', 'Unlimited products', 'Everything in Growth', 'Audit logs', 'Priority support'],
    },
]

const TIER_COLORS = {
    starter: 'bg-gray-100 text-gray-700',
    growth: 'bg-blue-100 text-blue-700',
    business: 'bg-purple-100 text-purple-700',
}

const TABS = ['Profile', 'Business', 'Branches', 'Staff', 'Billing']

export default function RetailSettings() {
    const { user, profile, fetchProfile } = useAuth()

    const [activeTab, setActiveTab] = useState('Profile')
    const [saving, setSaving] = useState(false)
    const [subscribing, setSubscribing] = useState(false)
    const [billingInterval, setBillingInterval] = useState('monthly')
    const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name ?? '' })
    const [businessForm, setBusinessForm] = useState({
        name: profile?.businesses?.name ?? '',
        phone: profile?.businesses?.phone ?? '',
        address: profile?.businesses?.address ?? '',
    })
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    const tier = profile?.subscription?.tier ?? 'starter'
    const subStatus = profile?.subscription?.status
    const isTrialing = subStatus === 'trialing'
    const trialEnd = profile?.subscription?.trial_end
    const isInactiveState = ['inactive', 'cancelled', 'past_due'].includes(subStatus)

    // Load Paystack
    useEffect(() => {
        const existing = document.querySelector('script[src*="paystack"]')
        if (existing) return
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.async = true
        document.body.appendChild(script)
    }, [])

    async function saveProfile() {
        setSaving(true)
        setError('')
        setSuccess('')
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: profileForm.full_name.trim() })
            .eq('id', user.id)
        if (error) setError(error.message)
        else { setSuccess('Profile updated'); await fetchProfile(user.id) }
        setSaving(false)
    }

    async function saveBusiness() {
        setSaving(true)
        setError('')
        setSuccess('')
        const { error } = await supabase
            .from('businesses')
            .update({
                name: businessForm.name.trim(),
                phone: businessForm.phone.trim() || null,
                address: businessForm.address.trim() || null,
            })
            .eq('id', profile.business_id)
        if (error) setError(error.message)
        else { setSuccess('Business updated'); await fetchProfile(user.id) }
        setSaving(false)
    }

    function handleSubscribe(plan) {
        if (!window.PaystackPop) return setError('Payment system is loading. Please try again in a moment.')
        setError('')
        setSubscribing(true)

        const planCode = billingInterval === 'yearly' ? plan.yearlyCode : plan.monthlyCode
        const amount = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice

        setTimeout(() => {
            setSubscribing(false)

            const handler = window.PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: amount * 100,
                plan: planCode,
                currency: 'NGN',
                channels: ['card'],
                ref: `VTX-SETTINGS-${profile.business_id.slice(0, 8)}-${Date.now()}`,
                metadata: {
                    business_id: profile.business_id,
                    tier: plan.tier,
                    interval: billingInterval,
                    mode: 'retail',
                },
                onClose: () => {
                    setError('Payment was cancelled.')
                },
                callback: function () {
                    async function onSuccess() {
                        await supabase
                            .from('subscriptions')
                            .update({
                                status: 'active',
                                tier: plan.tier,
                                is_trial: false,
                                trial_start: null,
                                trial_end: null,
                            })
                            .eq('business_id', profile.business_id)
                        await fetchProfile(user.id)
                        setSuccess(`Successfully activated ${plan.name} plan!`)
                    }
                    onSuccess()
                },
            })

            handler.openIframe()
        }, 100)
    }

    return (
        <PageWrapper title="Settings">
            {/* Tab navigation */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
                {TABS.map(tab => (
                    <button key={tab} onClick={() => { setActiveTab(tab); setSuccess(''); setError('') }}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {(success || error) && (
                <div className={`rounded-lg px-4 py-3 mb-4 text-sm ${success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                    {success || error}
                </div>
            )}

            {/* ── Profile tab ── */}
            {activeTab === 'Profile' && (
                <div className="max-w-md space-y-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Your Profile</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input value={profileForm.full_name} onChange={e => setProfileForm({ full_name: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input value={user?.email ?? ''} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <input value={profile?.role ?? ''} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed capitalize" />
                        </div>
                        <button onClick={saveProfile} disabled={saving} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Business tab ── */}
            {activeTab === 'Business' && (
                <div className="max-w-md space-y-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Business Details</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                            <input value={businessForm.name} onChange={e => setBusinessForm({ ...businessForm, name: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input value={businessForm.phone} onChange={e => setBusinessForm({ ...businessForm, phone: e.target.value })}
                                placeholder="08012345678" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <textarea value={businessForm.address} onChange={e => setBusinessForm({ ...businessForm, address: e.target.value })}
                                rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                        <button onClick={saveBusiness} disabled={saving} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Business'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Billing tab ── */}
            {activeTab === 'Billing' && (
                <div className="max-w-2xl space-y-5">

                    {/* Current plan card */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Plan</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${TIER_COLORS[tier] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                                </span>
                                {isTrialing && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                                        🎁 Free Trial
                                    </span>
                                )}
                                {isInactiveState && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                                        ⚠️ {subStatus === 'past_due' ? 'Payment Failed' : subStatus === 'cancelled' ? 'Cancelled' : 'Inactive'}
                                    </span>
                                )}
                            </div>
                            {isTrialing && trialEnd && (
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Trial ends</p>
                                    <p className="text-sm font-semibold text-gray-700">
                                        {new Date(trialEnd).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            )}
                            {!isTrialing && !isInactiveState && profile?.subscription?.current_period_end && (
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Renews</p>
                                    <p className="text-sm font-semibold text-gray-700">
                                        {new Date(profile.subscription.current_period_end).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {isTrialing && (
                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                                You're on a free trial with full Business plan access. Subscribe below to keep access after your trial ends.
                            </div>
                        )}
                        {isInactiveState && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                                {subStatus === 'past_due'
                                    ? 'Your last payment failed. Select a plan below to reactivate your account.'
                                    : 'Your subscription is not active. Select a plan below to regain full access.'}
                            </div>
                        )}
                    </div>

                    {/* Plan selection */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900">
                                {isTrialing ? 'Subscribe Now' : isInactiveState ? 'Activate a Plan' : 'Change Plan'}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setBillingInterval('monthly')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${billingInterval === 'monthly' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                    Monthly
                                </button>
                                <button onClick={() => setBillingInterval('yearly')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${billingInterval === 'yearly' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                    Yearly <span className="ml-1 text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">15% off</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {RETAIL_PLANS.map(plan => {
                                const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
                                const monthlyEquiv = billingInterval === 'yearly' ? Math.round(plan.yearlyPrice / 12).toLocaleString() : null
                                // isCurrent = only true when subscription is actually active on this plan
                                const isCurrent = subStatus === 'active' && tier === plan.tier
                                const wasPreviousPlan = isInactiveState && tier === plan.tier

                                return (
                                    <div key={plan.tier}
                                        className={`border-2 rounded-xl p-4 relative flex flex-col ${isCurrent ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                                        {plan.badge && !isCurrent && !wasPreviousPlan && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                {plan.badge}
                                            </span>
                                        )}
                                        {isCurrent && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                Current Plan
                                            </span>
                                        )}
                                        {wasPreviousPlan && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                Previous Plan
                                            </span>
                                        )}

                                        <div className="mb-2">
                                            <h3 className="text-sm font-bold text-gray-900">{plan.name}</h3>
                                            <p className="text-xl font-bold text-gray-900 mt-1">
                                                ₦{price.toLocaleString()}
                                                <span className="text-xs font-normal text-gray-400">/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                                            </p>
                                            {monthlyEquiv && <p className="text-xs text-green-600">₦{monthlyEquiv}/mo</p>}
                                        </div>

                                        <ul className="space-y-1 mb-4 flex-1">
                                            {plan.features.map(f => (
                                                <li key={f} className="text-xs text-gray-500 flex items-start gap-1">
                                                    <span className="text-green-500 shrink-0">✓</span> {f}
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleSubscribe(plan)}
                                            disabled={subscribing || isCurrent}
                                            className={`w-full py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${isCurrent
                                                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                                : isTrialing || isInactiveState
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-gray-900 text-white hover:bg-gray-700'
                                                }`}
                                        >
                                            {subscribing ? 'Opening...'
                                                : isCurrent ? '✓ Active'
                                                    : isInactiveState ? `Activate ${plan.name} — ₦${price.toLocaleString()}`
                                                        : isTrialing ? `Subscribe — ₦${price.toLocaleString()}`
                                                            : `Switch to ${plan.name}`
                                            }
                                        </button>
                                    </div>
                                )
                            })}
                        </div>

                        <p className="text-xs text-center text-gray-400 mt-4">
                            Secure payment via Paystack · Auto-renews · Cancel anytime
                        </p>
                    </div>
                </div>
            )}

            {/* Placeholder tabs */}
            {(activeTab === 'Branches' || activeTab === 'Staff') && (
                <div className="text-sm text-gray-500 py-8 text-center">
                    {activeTab} management — built in the main Settings component
                </div>
            )}
        </PageWrapper>
    )
}