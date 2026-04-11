import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// ─── Business Mode ────────────────────────────────────────────────────────────
const BUSINESS_MODES = [
    {
        value: 'retail',
        label: 'Physical Store',
        icon: '🏪',
        desc: 'I run a retail shop, restaurant, pharmacy, or any business with a physical location.',
    },
    {
        value: 'online_vendor',
        label: 'Online Vendor',
        icon: '📦',
        desc: 'I sell online via WhatsApp, Instagram, or my website and need to manage orders & deliveries.',
    },
]

// ─── Retail Business Types (expanded) ────────────────────────────────────────
const RETAIL_TYPES = [
    { value: 'retail', label: '🛒 Retail Shop' },
    { value: 'restaurant', label: '🍽️ Restaurant / Food' },
    { value: 'pharmacy', label: '💊 Pharmacy' },
    { value: 'fashion', label: '👗 Fashion / Boutique' },
    { value: 'electronics', label: '📱 Electronics' },
    { value: 'supermarket', label: '🏬 Supermarket' },
    { value: 'others', label: '➕ Others' },
]

// ─── Vendor Categories (expanded) ────────────────────────────────────────────
const VENDOR_CATEGORIES = [
    { value: 'fashion', label: '👗 Fashion & Clothing' },
    { value: 'shoes', label: '👟 Shoes & Footwear' },
    { value: 'bags', label: '👜 Bags & Accessories' },
    { value: 'beauty', label: '💄 Beauty & Skincare' },
    { value: 'hair', label: '💇 Hair & Wigs' },
    { value: 'electronics', label: '📱 Phones & Electronics' },
    { value: 'gadgets', label: '🎧 Gadgets & Accessories' },
    { value: 'food', label: '🍱 Food & Snacks' },
    { value: 'groceries', label: '🛒 Groceries & Provisions' },
    { value: 'health', label: '💊 Health & Wellness' },
    { value: 'home', label: '🏠 Home & Living' },
    { value: 'kids', label: '🧸 Kids & Baby Products' },
    { value: 'jewelry', label: '💍 Jewelry & Accessories' },
    { value: 'art', label: '🎨 Art & Crafts' },
    { value: 'books', label: '📚 Books & Stationery' },
    { value: 'sports', label: '⚽ Sports & Fitness' },
    { value: 'auto', label: '🚗 Auto Parts & Accessories' },
    { value: 'general', label: '📦 General Merchandise' },
    { value: 'others', label: '➕ Others — type your own' },
]

// ─── Retail Plans ─────────────────────────────────────────────────────────────
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

// ─── Online Vendor Plans ──────────────────────────────────────────────────────
const VENDOR_PLANS = [
    {
        tier: 'solo',
        name: 'Solo',
        monthlyPrice: 4500,
        yearlyPrice: 45900,
        monthlyCode: 'PLN_ld2wkx75vf2owop',
        yearlyCode: 'PLN_liieyblqil0xgma',
        features: ['100 orders/month', '1 user account', 'Up to 50 products', 'Order management', 'Customer tracking', 'Logistics directory'],
    },
    {
        tier: 'hustle',
        name: 'Hustle',
        monthlyPrice: 9500,
        yearlyPrice: 96900,
        monthlyCode: 'PLN_7j4dvngdd7q1xcd',
        yearlyCode: 'PLN_1a7tboh8temcq9t',
        badge: 'Most Popular',
        features: ['500 orders/month', '2 user accounts', 'Unlimited products', 'Everything in Solo', 'Payment tracking', 'Delivery tracking'],
    },
    {
        tier: 'scale',
        name: 'Scale',
        monthlyPrice: 18000,
        yearlyPrice: 183600,
        monthlyCode: 'PLN_oxtaphfdtb7tvth',
        yearlyCode: 'PLN_n3mxm6r1aaydvnd',
        badge: 'Best Value',
        features: ['Unlimited orders', '5 user accounts', 'Unlimited products', 'Everything in Hustle', 'Full reports & export', 'Storefront link', 'Priority support'],
    },
]

// ─── Steps ────────────────────────────────────────────────────────────────────
const RETAIL_STEPS = ['Business Info', 'Contact & Address', 'Main Branch', 'Choose Plan', 'Payment']
const VENDOR_STEPS = ['Business Info', 'Contact & Address', 'Choose Plan', 'Start Trial']

export default function Onboarding() {
    const navigate = useNavigate()
    const { user, fetchProfile } = useAuth()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [logoFile, setLogoFile] = useState(null)
    const [logoPreview, setLogoPreview] = useState(null)
    const [billingInterval, setBillingInterval] = useState('monthly')
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [customBusinessType, setCustomBusinessType] = useState('')
    const [paystackReady, setPaystackReady] = useState(false)

    const [form, setForm] = useState({
        business_mode: '',
        business_name: '',
        business_type: '',
        phone: '',
        email: '',
        address: '',
        branch_name: '',
    })

    const isVendor = form.business_mode === 'online_vendor'
    const STEPS = isVendor ? VENDOR_STEPS : RETAIL_STEPS
    const PLANS = isVendor ? VENDOR_PLANS : RETAIL_PLANS
    const currentCategories = isVendor ? VENDOR_CATEGORIES : RETAIL_TYPES
    const showOthersField = form.business_type === 'others'

    // Load Paystack inline script
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.async = true

        script.onload = () => {
            setPaystackReady(true)
        }

        script.onerror = () => {
            setError('Payment system failed to load. Please refresh the page.')
        }

        document.body.appendChild(script)

        return () => {
            const existingScript = document.querySelector('script[src*="paystack"]')
            if (existingScript && document.body.contains(existingScript)) {
                document.body.removeChild(existingScript)
            }
            if (logoPreview) {
                URL.revokeObjectURL(logoPreview)
            }
        }
    }, [])

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    function handleLogoChange(e) {
        const file = e.target.files[0]
        if (!file) return

        if (logoPreview) {
            URL.revokeObjectURL(logoPreview)
        }

        setLogoFile(file)
        setLogoPreview(URL.createObjectURL(file))
    }

    function nextStep() {
        setError('')

        if (step === 1 && !form.business_mode) return setError('Please select how you run your business')
        if (step === 1 && !form.business_name.trim()) return setError('Business name is required')
        if (step === 1 && !form.business_type) return setError('Please select what you sell')
        if (step === 1 && form.business_type === 'others' && !customBusinessType.trim()) return setError('Please describe what you sell')

        if (!isVendor && step === 3 && !form.branch_name.trim()) return setError('Branch name is required')

        const planStep = isVendor ? 3 : 4
        if (step === planStep && !selectedPlan) return setError('Please select a plan to continue')

        setStep(step + 1)
    }

    function prevStep() {
        setError('')
        setStep(step - 1)
    }

    async function setupBusiness() {
        setLoading(true)
        setError('')

        try {
            let logo_url = null
            if (logoFile) {
                const ext = logoFile.name.split('.').pop()
                const path = `${user.id}/logo.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('business-logos')
                    .upload(path, logoFile, { upsert: true })

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from('business-logos')
                        .getPublicUrl(path)
                    logo_url = urlData.publicUrl
                }
            }

            const resolvedType = form.business_type === 'others' ? customBusinessType.trim() : form.business_type

            const { data: business, error: bizError } = await supabase
                .from('businesses')
                .insert({
                    name: form.business_name.trim(),
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    address: form.address.trim() || null,
                    logo_url,
                    mode: form.business_mode,
                    business_type: resolvedType,
                })
                .select()
                .single()

            if (bizError) throw bizError

            const branchName = isVendor ? 'Online Store' : form.branch_name.trim()
            const { data: branch, error: branchError } = await supabase
                .from('branches')
                .insert({
                    business_id: business.id,
                    name: branchName,
                    address: form.address.trim() || null,
                    is_main: true,
                })
                .select()
                .single()

            if (branchError) throw branchError

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    business_id: business.id,
                    branch_id: branch.id,
                })
                .eq('id', user.id)

            if (profileError) throw profileError

            try {
                await supabase.rpc('seed_expense_categories', { p_business_id: business.id })
            } catch (rpcError) {
                // Silently handle RPC error
            }

            return { business, branch }
        } catch (err) {
            setError(err.message)
            setLoading(false)
            return null
        }
    }

    async function handleStartTrial() {
        setError('')
        const result = await setupBusiness()
        if (!result) return

        const now = new Date()
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

        const { error: subError } = await supabase
            .from('subscriptions')
            .insert({
                business_id: result.business.id,
                tier: 'scale',
                status: 'trialing',
                is_trial: true,
                trial_start: now.toISOString(),
                trial_end: trialEnd.toISOString(),
            })

        if (subError) {
            setError(subError.message)
            setLoading(false)
            return
        }

        await fetchProfile(user.id)
        setLoading(false)
        navigate('/dashboard')
    }

    async function handlePayment() {
        setError('')

        if (!paystackReady || !window.PaystackPop) {
            setError('Payment system is still loading. Please wait a moment.')
            return
        }

        const result = await setupBusiness()
        if (!result) return

        const { error: subError } = await supabase
            .from('subscriptions')
            .insert({
                business_id: result.business.id,
                tier: selectedPlan.tier,
                status: 'inactive',
            })

        if (subError) {
            setError(subError.message)
            setLoading(false)
            return
        }

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
            ref: `VTX-${result.business.id.slice(0, 8)}-${Date.now()}`,
            metadata: {
                business_id: result.business.id,
                tier: selectedPlan.tier,
                interval: billingInterval,
                mode: form.business_mode,
            },
            onClose: () => {
                setError('Payment was cancelled. Your account has been created but your subscription is inactive. Go to Settings → Billing to complete payment and activate your account.')
                setLoading(false)
                fetchProfile(user.id).then(() => navigate('/dashboard'))
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
                        .eq('business_id', result.business.id)

                    await fetchProfile(user.id)
                    navigate('/dashboard')
                }
                onSuccess()
            },
        })

        handler.openIframe()
    }

    function handleFinalStep() {
        if (isVendor) {
            handleStartTrial()
        } else {
            handlePayment()
        }
    }

    const totalSteps = STEPS.length

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
            <div className={`bg-white rounded-2xl shadow w-full ${step === (isVendor ? 3 : 4) ? 'max-w-3xl' : 'max-w-lg'} p-8 transition-all duration-300`}>
                {/* Logo Header */}
                <div className="flex flex-col items-center justify-center mb-8 pb-4 border-b border-gray-100">
                    <img src="/logo.png" alt="Vortex" className="h-16 w-16 object-contain mb-3" />
                    <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                        Vortex
                    </span>
                </div>
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Set up your business</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Step {step} of {totalSteps} — {STEPS[step - 1]}
                    </p>
                </div>

                {/* Progress bar */}
                <div className="flex gap-2 mb-8">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i + 1 <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
                        />
                    ))}
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Step 1 — Business Info */}
                {step === 1 && (
                    <div className="space-y-6">
                        {/* Mode selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">How do you run your business?</label>
                            <div className="grid grid-cols-1 gap-3">
                                {BUSINESS_MODES.map((mode) => (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        onClick={() => {
                                            setForm({ ...form, business_mode: mode.value, business_type: '' })
                                            setSelectedPlan(null)
                                            setCustomBusinessType('')
                                        }}
                                        className={`border-2 rounded-xl px-4 py-3 text-left transition flex items-start gap-3 ${form.business_mode === mode.value
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <span className="text-2xl mt-0.5">{mode.icon}</span>
                                        <div>
                                            <p className={`text-sm font-semibold ${form.business_mode === mode.value ? 'text-blue-700' : 'text-gray-800'}`}>
                                                {mode.label}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">{mode.desc}</p>
                                        </div>
                                        {form.business_mode === mode.value && (
                                            <span className="ml-auto text-blue-600 text-lg self-center">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Logo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo (optional)</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                                    {logoPreview
                                        ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                                        : <span className="text-2xl">🏢</span>
                                    }
                                </div>
                                <label className="cursor-pointer text-sm text-blue-600 font-medium hover:underline">
                                    Upload logo
                                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* Business name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Business Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="business_name"
                                value={form.business_name}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={isVendor ? "e.g. Adaeze's Closet" : "e.g. Mama Tee's Kitchen"}
                            />
                        </div>

                        {/* Business type — conditional */}
                        {form.business_mode && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {isVendor ? 'What do you sell?' : 'Business Type'} <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {currentCategories.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => {
                                                setForm({ ...form, business_type: type.value })
                                                if (type.value !== 'others') setCustomBusinessType('')
                                            }}
                                            className={`border rounded-lg px-3 py-2.5 text-sm font-medium transition text-left ${form.business_type === type.value
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                                }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                                {showOthersField && (
                                    <div className="mt-3">
                                        <input
                                            value={customBusinessType}
                                            onChange={e => setCustomBusinessType(e.target.value)}
                                            placeholder={isVendor ? 'e.g. Handmade candles, Custom cakes...' : 'e.g. Laundry service, Event planning...'}
                                            className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                                            autoFocus
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Describe what you sell in a few words</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2 — Contact & Address */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="business@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                name="phone"
                                type="tel"
                                value={form.phone}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="08012345678"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isVendor ? 'Your Location / Operating Address' : 'Business Address'}
                            </label>
                            <textarea
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="12 Akin Adesola Street, Victoria Island, Lagos"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3 — Main Branch (retail only) */}
                {!isVendor && step === 3 && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Every business starts with a main branch. You can add more branches later from your settings.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                            <input
                                name="branch_name"
                                value={form.branch_name}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Main Branch, HQ, Ikeja Branch"
                            />
                        </div>
                    </div>
                )}

                {/* Choose Plan step */}
                {((isVendor && step === 3) || (!isVendor && step === 4)) && (
                    <div className="space-y-5">
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

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {PLANS.map(plan => {
                                const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
                                const monthlyEquiv = billingInterval === 'yearly'
                                    ? Math.round(plan.yearlyPrice / 12).toLocaleString()
                                    : null
                                const isSelected = selectedPlan?.tier === plan.tier

                                return (
                                    <button
                                        key={plan.tier}
                                        onClick={() => setSelectedPlan(plan)}
                                        className={`border-2 rounded-xl p-4 text-left transition relative ${isSelected
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        {plan.badge && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
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
                                        </ul>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Vendor trial nudge */}
                        {isVendor && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                                <span className="text-lg">🎁</span>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <span className="font-semibold">Not sure yet?</span> Continue — you'll get a free 14-day trial on the <span className="font-semibold">Scale plan</span> with no card required.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Vendor trial step */}
                {isVendor && step === 4 && (
                    <div className="space-y-5">
                        <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 text-center space-y-3">
                            <div className="text-4xl">🚀</div>
                            <h2 className="text-lg font-bold text-gray-900">You're almost in!</h2>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Your free 14-day trial starts now. You'll get <span className="font-semibold text-blue-700">full Scale plan access</span> — unlimited orders, 5 users, full reports, storefront link, and delivery tracking.
                            </p>
                            <div className="bg-white rounded-xl border border-blue-100 px-4 py-3 text-left space-y-2">
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">What's included in your trial</p>
                                {VENDOR_PLANS.find(p => p.tier === 'scale')?.features.map(f => (
                                    <p key={f} className="text-xs text-gray-600 flex items-center gap-2">
                                        <span className="text-blue-500">✓</span> {f}
                                    </p>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400">No credit card required. After 14 days, choose a plan to continue.</p>
                        </div>

                        {selectedPlan && (
                            <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Your plan after trial</p>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {selectedPlan.name} — ₦{(billingInterval === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice).toLocaleString()}/{billingInterval === 'yearly' ? 'yr' : 'mo'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Change
                                </button>
                            </div>
                        )}

                        {!selectedPlan && (
                            <p className="text-xs text-center text-gray-400">
                                You didn't select a plan — you can do that later from Settings → Billing when your trial ends.
                            </p>
                        )}
                    </div>
                )}

                {/* Retail payment step */}
                {!isVendor && step === 5 && selectedPlan && (
                    <div className="space-y-5">
                        <div className="bg-blue-50 rounded-xl p-5 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Plan</span>
                                <span className="font-medium text-gray-900 capitalize">{selectedPlan.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Billing</span>
                                <span className="font-medium text-gray-900 capitalize">{billingInterval}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Business</span>
                                <span className="font-medium text-gray-900">{form.business_name}</span>
                            </div>
                            <div className="border-t border-blue-100 pt-3 flex justify-between">
                                <span className="text-sm font-semibold text-gray-900">Total</span>
                                <span className="text-xl font-bold text-blue-600">
                                    ₦{(billingInterval === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                            <p>✓ Secure payment powered by Paystack</p>
                            <p>✓ Auto-renews {billingInterval === 'yearly' ? 'annually' : 'monthly'} — cancel anytime</p>
                            <p>✓ Access starts immediately after payment</p>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 mt-8">
                    {step > 1 && (
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={loading}
                            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                        >
                            Back
                        </button>
                    )}

                    {step < totalSteps ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleFinalStep}
                            disabled={loading || (!isVendor && !paystackReady)}
                            className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? 'Setting up...'
                                : isVendor
                                    ? 'Start My Free 14-Day Trial →'
                                    : `Pay ₦${(billingInterval === 'yearly' ? selectedPlan?.yearlyPrice : selectedPlan?.monthlyPrice)?.toLocaleString()} & Get Started`
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}