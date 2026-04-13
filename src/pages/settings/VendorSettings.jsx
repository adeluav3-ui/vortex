import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

const VENDOR_PLANS = [
    {
        tier: 'solo',
        name: 'Solo',
        monthlyPrice: 4500,
        yearlyPrice: 45900,
        monthlyCode: 'PLN_d9m124pd092cpui',
        yearlyCode: 'PLN_28h5ift57qbqwq3',
        features: ['100 orders/month', '1 user account', 'Up to 50 products', 'Order management', 'Logistics directory'],
    },
    {
        tier: 'hustle',
        name: 'Hustle',
        monthlyPrice: 9500,
        yearlyPrice: 96900,
        monthlyCode: 'PLN_mrktco8sssbklsg',
        yearlyCode: 'PLN_fi9rzzwohf7xrg1',
        badge: 'Most Popular',
        features: ['500 orders/month', '2 user accounts', 'Unlimited products', 'Payment tracking', 'Delivery tracker'],
    },
    {
        tier: 'scale',
        name: 'Scale',
        monthlyPrice: 18000,
        yearlyPrice: 183600,
        monthlyCode: 'PLN_t8b1rhycyy53akc',
        yearlyCode: 'PLN_93flwzwjsdn2sea',
        badge: 'Best Value',
        features: ['Unlimited orders', '5 user accounts', 'Unlimited products', 'Full reports & export', 'Storefront link'],
    },
]

const TIER_COLORS = {
    solo: 'bg-gray-100 text-gray-700',
    hustle: 'bg-blue-50 text-blue-700',
    scale: 'bg-indigo-50 text-indigo-700',
}

export default function VendorSettings() {
    const { profile, fetchProfile, user, signOut } = useAuth()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState('profile')
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [billingInterval, setBillingInterval] = useState('monthly')
    const [subscribing, setSubscribing] = useState(false)

    const [profileForm, setProfileForm] = useState({
        full_name: profile?.full_name ?? '',
    })

    const [businessForm, setBusinessForm] = useState({
        name: '', phone: '', email: '', address: '',
    })

    const tier = profile?.businesses?.subscription_tier ?? 'solo'
    const isTrialing = profile?.subscription?.status === 'trialing'
    const trialEnd = profile?.subscription?.trial_end

    // Load Paystack
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.async = true
        document.body.appendChild(script)
        return () => document.body.removeChild(script)
    }, [])

    useEffect(() => {
        if (!profile?.business_id) return
        fetchBusiness()
    }, [profile?.business_id])

    async function fetchBusiness() {
        const { data } = await supabase
            .from('businesses')
            .select('name, phone, email, address')
            .eq('id', profile.business_id)
            .single()
        if (data) setBusinessForm({ name: data.name ?? '', phone: data.phone ?? '', email: data.email ?? '', address: data.address ?? '' })
    }

    async function saveProfile() {
        setSaving(true); setError(''); setSuccess('')
        const { error: e } = await supabase.from('profiles').update({ full_name: profileForm.full_name }).eq('id', user.id)
        if (e) setError(e.message)
        else { setSuccess('Profile updated.'); await fetchProfile(user.id) }
        setSaving(false)
    }

    async function saveBusiness() {
        setSaving(true); setError(''); setSuccess('')
        const { error: e } = await supabase
            .from('businesses')
            .update({ name: businessForm.name, phone: businessForm.phone, email: businessForm.email, address: businessForm.address })
            .eq('id', profile.business_id)
        if (e) setError(e.message)
        else { setSuccess('Business info updated.'); await fetchProfile(user.id) }
        setSaving(false)
    }

    function handleSubscribe(plan) {
        setError('')
        setSubscribing(true)

        const planCode = billingInterval === 'yearly' ? plan.yearlyCode : plan.monthlyCode
        const amount = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice

        const handler = window.PaystackPop.setup({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
            email: user.email,
            amount: amount * 100,
            plan: planCode,
            currency: 'NGN',
            ref: `VTX-UPG-${profile.business_id.slice(0, 8)}-${Date.now()}`,
            metadata: {
                business_id: profile.business_id,
                tier: plan.tier,
                interval: billingInterval,
                from_trial: isTrialing,
            },
            onClose: () => {
                setSubscribing(false)
            },
            callback: function () {
                // Paystack requires a plain function — kick off async work separately
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
                    setSubscribing(false)
                    setSuccess(`Successfully subscribed to ${plan.name}!`)
                }
                onSuccess()
            },
        })

        handler.openIframe()
    }

    const TABS = [
        { value: 'profile', label: '👤 Profile' },
        { value: 'business', label: '🏢 Business' },
        { value: 'billing', label: '💳 Billing' },
    ]

    return (
        <PageWrapper title="Settings">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => { setActiveTab(tab.value); setSuccess(''); setError('') }}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4"><p className="text-sm text-red-600">{error}</p></div>}
            {success && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4"><p className="text-sm text-green-700">✓ {success}</p></div>}

            {/* ── Profile ── */}
            {activeTab === 'profile' && (
                <div className="max-w-md space-y-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Your Profile</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                value={profileForm.full_name}
                                onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input value={user?.email ?? ''} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                            <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
                        </div>
                        <button onClick={saveProfile} disabled={saving} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Account</h3>
                        <button onClick={signOut} className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 rounded-lg py-2 text-sm font-medium hover:bg-red-50 transition">
                            🚪 Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* ── Business ── */}
            {activeTab === 'business' && (
                <div className="max-w-md space-y-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Business Info</h3>
                        {[
                            { label: 'Business Name', key: 'name' },
                            { label: 'Phone Number', key: 'phone' },
                            { label: 'Email', key: 'email', type: 'email' },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                                <input
                                    type={field.type ?? 'text'}
                                    value={businessForm[field.key]}
                                    onChange={e => setBusinessForm({ ...businessForm, [field.key]: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <textarea
                                value={businessForm.address}
                                onChange={e => setBusinessForm({ ...businessForm, address: e.target.value })}
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                        <button onClick={saveBusiness} disabled={saving} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Business Info'}
                        </button>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Storefront</h3>
                        <p className="text-xs text-gray-400 mb-3">Manage your public store link, WhatsApp number, and product catalog.</p>
                        <button onClick={() => navigate('/storefront')} className="w-full border border-blue-200 text-blue-600 rounded-lg py-2 text-sm font-medium hover:bg-blue-50 transition">
                            Go to Storefront Settings →
                        </button>
                    </div>
                </div>
            )}

            {/* ── Billing ── */}
            {activeTab === 'billing' && (
                <div className="max-w-2xl space-y-5">

                    {/* Current plan card */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Plan</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${TIER_COLORS[tier]}`}>
                                    {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                                </span>
                                {isTrialing && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                                        🎁 Free Trial
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
                            {!isTrialing && profile?.subscription?.current_period_end && (
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
                                You're on a free trial with full Scale plan access. Subscribe below to keep your access after the trial ends — you can subscribe to any plan even before the trial ends.
                            </div>
                        )}
                    </div>

                    {/* Subscribe / upgrade */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900">
                                {isTrialing ? 'Subscribe Now' : ['inactive', 'cancelled', 'past_due'].includes(profile?.subscription?.status) ? 'Activate a Plan' : 'Change Plan'}
                            </h3>
                            {/* Billing interval toggle */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setBillingInterval('monthly')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${billingInterval === 'monthly' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBillingInterval('yearly')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${billingInterval === 'yearly' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    Yearly <span className="ml-1 text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">15% off</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {VENDOR_PLANS.map(plan => {
                                const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
                                const monthlyEquiv = billingInterval === 'yearly' ? Math.round(plan.yearlyPrice / 12).toLocaleString() : null
                                const isCurrent = !isTrialing && tier === plan.tier && profile?.subscription?.status === 'active'
                                const isInactiveState = ['inactive', 'cancelled', 'past_due'].includes(profile?.subscription?.status)
                                const isScale = plan.tier === 'scale'

                                return (
                                    <div
                                        key={plan.tier}
                                        className={`border-2 rounded-xl p-4 relative flex flex-col ${isCurrent ? 'border-green-400 bg-green-50' : isScale ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}
                                    >
                                        {plan.badge && !isCurrent && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                {plan.badge}
                                            </span>
                                        )}
                                        {isCurrent && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                Current Plan
                                            </span>
                                        )}
                                        {isInactiveState && tier === plan.tier && (
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
                                            {monthlyEquiv && (
                                                <p className="text-xs text-green-600">₦{monthlyEquiv}/mo</p>
                                            )}
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
                                                : isScale || isTrialing || isInactiveState
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-gray-900 text-white hover:bg-gray-700'
                                                }`}
                                        >
                                            {subscribing ? 'Opening...' : isCurrent ? '✓ Active' : isTrialing ? `Subscribe — ₦${price.toLocaleString()}` : isInactiveState ? `Activate ${plan.name} — ₦${price.toLocaleString()}` : `Switch to ${plan.name}`}
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
        </PageWrapper>
    )
}